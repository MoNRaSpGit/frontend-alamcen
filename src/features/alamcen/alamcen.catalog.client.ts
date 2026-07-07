import { AuthFetchMetrics, fetchWithAuth, fetchWithAuthDetailed, logoutSession } from "../auth/auth.client";
import { getApiBaseUrl } from "../../shared/config/api";
import { readJsonStorage, writeJsonStorage } from "../../shared/lib/persistence";
import { AlamcenDashboardPayload, AlamcenModuleStatus, AlamcenSalePayload, BarcodeProductLookup } from "./alamcen.types";
import { warnPrimeCacheFailure } from "./alamcen.diagnostics";

const PRODUCT_LOOKUP_CACHE_KEY = "alamcen.product-lookup-cache.v1";
const PRODUCT_LOOKUP_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const PRODUCT_LOOKUP_CACHE_MAX_ENTRIES = 250;
const PRODUCT_LOOKUP_PRIME_DAY_KEY = "alamcen.product-lookup-cache.prime-day.v1";
const PRODUCT_LOOKUP_PRIME_LIMIT = 100;
const PENDING_SALES_QUEUE_KEY = "alamcen.pending-sales-queue.v1";

type CachedLookupEntry = {
  barcode: string;
  apiBaseUrl: string;
  cachedAt: number;
  product: BarcodeProductLookup;
};

type StoredLookupCache = {
  dayKey: string;
  entries: CachedLookupEntry[];
};

type PendingQueuedSale = {
  id: string;
  queuedAt: string;
  attempts: number;
  payload: AlamcenSalePayload;
};

const inMemoryLookupCache = new Map<string, CachedLookupEntry>();
const inflightLookupRequests = new Map<string, Promise<BarcodeProductLookup | null>>();
let inflightSalesQueueFlush: Promise<void> | null = null;

export type BarcodeLookupMetrics = {
  cacheHit: boolean;
  sharedInflight: boolean;
  responseStatus: number | null;
  auth: AuthFetchMetrics | null;
  cacheReadMs: number;
  networkMs: number;
  parseMs: number;
  cacheWriteMs: number;
  totalMs: number;
};

export type AlamcenWarmupMetrics = {
  statusMs: number;
  statusAuth: AuthFetchMetrics | null;
  scannerRouteMs: number;
  scannerRouteStatus: number | null;
  scannerRouteAuth: AuthFetchMetrics | null;
  totalMs: number;
};

async function buildApiError(response: Response) {
  let message = `Error ${response.status}`;

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      message = payload.message.join(", ");
    } else if (payload.message) {
      message = payload.message;
    }
  } catch {
    // Keep generic message when response body is not JSON.
  }

  if (response.status === 401) {
    await logoutSession().catch(() => {});
  }

  return new Error(message);
}

function buildUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function normalizeBarcode(barcode: string) {
  return String(barcode || "").trim().replace(/\s+/g, "");
}

function getCacheDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readStoredLookupEntries() {
  const storedValue = readJsonStorage<StoredLookupCache | CachedLookupEntry[] | null>(PRODUCT_LOOKUP_CACHE_KEY, null);
  if (!storedValue) {
    return [];
  }

  if (Array.isArray(storedValue)) {
    return storedValue;
  }

  if (storedValue.dayKey !== getCacheDayKey()) {
    writeJsonStorage(PRODUCT_LOOKUP_CACHE_KEY, {
      dayKey: getCacheDayKey(),
      entries: []
    } satisfies StoredLookupCache);
    return [];
  }

  return Array.isArray(storedValue.entries) ? storedValue.entries : [];
}

function buildLookupCacheMap() {
  const storedEntries = readStoredLookupEntries();
  const now = Date.now();

  return storedEntries.reduce((cache, entry) => {
    if (!entry?.barcode || !entry?.apiBaseUrl || !entry?.product) {
      return cache;
    }

    if (now - Number(entry.cachedAt || 0) > PRODUCT_LOOKUP_CACHE_TTL_MS) {
      return cache;
    }

    cache.set(`${entry.apiBaseUrl}::${entry.barcode}`, entry);
    return cache;
  }, new Map<string, CachedLookupEntry>());
}

function persistLookupCache() {
  const entries = Array.from(inMemoryLookupCache.values())
    .sort((left, right) => Number(right.cachedAt || 0) - Number(left.cachedAt || 0))
    .slice(0, PRODUCT_LOOKUP_CACHE_MAX_ENTRIES);

  writeJsonStorage(PRODUCT_LOOKUP_CACHE_KEY, {
    dayKey: getCacheDayKey(),
    entries
  } satisfies StoredLookupCache);
}

function readPendingSalesQueue() {
  return readJsonStorage<PendingQueuedSale[]>(PENDING_SALES_QUEUE_KEY, []);
}

function writePendingSalesQueue(queue: PendingQueuedSale[]) {
  writeJsonStorage(PENDING_SALES_QUEUE_KEY, queue);
}

function getCachedLookup(barcode: string) {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) {
    return null;
  }

  if (!inMemoryLookupCache.size) {
    const hydratedCache = buildLookupCacheMap();
    hydratedCache.forEach((entry, key) => inMemoryLookupCache.set(key, entry));
  }

  const cacheKey = `${getApiBaseUrl()}::${normalizedBarcode}`;
  const entry = inMemoryLookupCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() - Number(entry.cachedAt || 0) > PRODUCT_LOOKUP_CACHE_TTL_MS) {
    inMemoryLookupCache.delete(cacheKey);
    persistLookupCache();
    return null;
  }

  return structuredClone(entry.product);
}

function setCachedLookup(barcode: string, product: BarcodeProductLookup) {
  const normalizedBarcode = normalizeBarcode(barcode || product.barcodeNormalized || product.barcode || "");
  if (!normalizedBarcode) {
    return;
  }

  const nextEntry: CachedLookupEntry = {
    barcode: normalizedBarcode,
    apiBaseUrl: getApiBaseUrl(),
    cachedAt: Date.now(),
    product: structuredClone(product)
  };

  inMemoryLookupCache.set(`${nextEntry.apiBaseUrl}::${nextEntry.barcode}`, nextEntry);
  persistLookupCache();
}

function refreshCachedLookupByProduct(product: BarcodeProductLookup) {
  const currentApiBaseUrl = getApiBaseUrl();
  let changed = false;

  inMemoryLookupCache.forEach((entry, key) => {
    if (entry.apiBaseUrl !== currentApiBaseUrl) {
      return;
    }

    if (Number(entry.product.id) !== Number(product.id)) {
      return;
    }

    inMemoryLookupCache.set(key, {
      ...entry,
      cachedAt: Date.now(),
      product: structuredClone(product)
    });
    changed = true;
  });

  if (changed) {
    persistLookupCache();
  }
}

async function parseOptionalJson<T>(response: Response) {
  const rawBody = await response.text();
  if (!rawBody.trim()) {
    return null;
  }

  return JSON.parse(rawBody) as T;
}

export async function fetchAlamcenStatus() {
  const response = await fetchWithAuth(buildUrl("/alamcen/status"));

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as AlamcenModuleStatus;
}

export async function warmAlamcenScanner() {
  const startedAt = performance.now();

  const scannerStartedAt = performance.now();
  const { response: scannerResponse, metrics: scannerAuth } = await fetchWithAuthDetailed(
    buildUrl(`/alamcen/productos/barcode/${encodeURIComponent("__warmup__")}`)
  );
  const scannerRouteMs = Math.round(performance.now() - scannerStartedAt);
  if (!scannerResponse.ok) {
    throw await buildApiError(scannerResponse);
  }

  await parseOptionalJson<BarcodeProductLookup>(scannerResponse);

  return {
    statusMs: 0,
    statusAuth: null,
    scannerRouteMs,
    scannerRouteStatus: scannerResponse.status,
    scannerRouteAuth: scannerAuth,
    totalMs: Math.round(performance.now() - startedAt)
  } satisfies AlamcenWarmupMetrics;
}

export async function resetBackendProductLookupCache() {
  const response = await fetchWithAuth(buildUrl("/alamcen/cache/product-lookup/reset"), {
    method: "POST"
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as {
    ok: true;
    clearedEntries: number;
  };
}

export async function listProducts(options: { search?: string; limit?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (options.search?.trim()) {
    searchParams.set("search", options.search.trim());
  }
  if (options.limit) {
    searchParams.set("limit", String(options.limit));
  }

  const query = searchParams.toString();
  const response = await fetchWithAuth(buildUrl(`/alamcen/products${query ? `?${query}` : ""}`));
  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as {
    count: number;
    items: BarcodeProductLookup[];
  };
}

export async function primeProductLookupCache() {
  if (typeof window === "undefined") {
    return;
  }

  const currentDayKey = getCacheDayKey();
  if (window.localStorage.getItem(PRODUCT_LOOKUP_PRIME_DAY_KEY) === currentDayKey) {
    return;
  }

  try {
    const payload = await listProducts({ limit: PRODUCT_LOOKUP_PRIME_LIMIT });
    payload.items.forEach((product) => {
      const cacheBarcode = product.barcodeNormalized || product.barcode;
      if (cacheBarcode) {
        setCachedLookup(cacheBarcode, product);
      }
    });
    window.localStorage.setItem(PRODUCT_LOOKUP_PRIME_DAY_KEY, currentDayKey);
  } catch (error) {
    warnPrimeCacheFailure(error);
  }
}

export async function findProductByBarcode(barcode: string) {
  const { product } = await findProductByBarcodeDetailed(barcode);
  return product;
}

export async function findProductByBarcodeDetailed(barcode: string) {
  const lookupStartedAt = performance.now();
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) {
    return {
      product: null,
      metrics: {
        cacheHit: false,
        sharedInflight: false,
        responseStatus: null,
        auth: null,
        cacheReadMs: 0,
        networkMs: 0,
        parseMs: 0,
        cacheWriteMs: 0,
        totalMs: 0
      } satisfies BarcodeLookupMetrics
    };
  }

  const cacheReadStartedAt = performance.now();
  const cachedProduct = getCachedLookup(normalizedBarcode);
  const cacheReadMs = Math.round(performance.now() - cacheReadStartedAt);
  if (cachedProduct) {
    return {
      product: cachedProduct,
      metrics: {
        cacheHit: true,
        sharedInflight: false,
        responseStatus: 200,
        auth: null,
        cacheReadMs,
        networkMs: 0,
        parseMs: 0,
        cacheWriteMs: 0,
        totalMs: Math.round(performance.now() - lookupStartedAt)
      } satisfies BarcodeLookupMetrics
    };
  }

  const inflightKey = `${getApiBaseUrl()}::${normalizedBarcode}`;
  const inflightRequest = inflightLookupRequests.get(inflightKey);
  if (inflightRequest) {
    const product = await inflightRequest;
    return {
      product,
      metrics: {
        cacheHit: false,
        sharedInflight: true,
        responseStatus: 200,
        auth: null,
        cacheReadMs,
        networkMs: Math.round(performance.now() - lookupStartedAt),
        parseMs: 0,
        cacheWriteMs: 0,
        totalMs: Math.round(performance.now() - lookupStartedAt)
      } satisfies BarcodeLookupMetrics
    };
  }

  const requestPromise = (async () => {
    const networkStartedAt = performance.now();
    const { response, metrics: authMetrics } = await fetchWithAuthDetailed(
      buildUrl(`/alamcen/productos/barcode/${encodeURIComponent(normalizedBarcode)}`),
      {
        cache: "no-store"
      }
    );
    const networkMs = Math.round(performance.now() - networkStartedAt);

    if (!response.ok) {
      throw await buildApiError(response);
    }

    const parseStartedAt = performance.now();
    const product = await parseOptionalJson<BarcodeProductLookup>(response);
    const parseMs = Math.round(performance.now() - parseStartedAt);
    let cacheWriteMs = 0;
    if (product) {
      const cacheWriteStartedAt = performance.now();
      setCachedLookup(normalizedBarcode, product);
      cacheWriteMs = Math.round(performance.now() - cacheWriteStartedAt);
    }

    return {
      product,
      metrics: {
        cacheHit: false,
        sharedInflight: false,
        responseStatus: response.status,
        auth: authMetrics,
        cacheReadMs,
        networkMs,
        parseMs,
        cacheWriteMs,
        totalMs: Math.round(performance.now() - lookupStartedAt)
      } satisfies BarcodeLookupMetrics
    };
  })();

  inflightLookupRequests.set(
    inflightKey,
    requestPromise.then((result) => result.product)
  );

  try {
    return await requestPromise;
  } finally {
    inflightLookupRequests.delete(inflightKey);
  }
}

export function clearProductLookupCache() {
  inMemoryLookupCache.clear();
  if (typeof window !== "undefined") {
    // Manual reset helps re-measure first-scan latency from a clean local cache state.
    window.localStorage.removeItem(PRODUCT_LOOKUP_CACHE_KEY);
    window.localStorage.removeItem(PRODUCT_LOOKUP_PRIME_DAY_KEY);
  }
}

export async function createManualProduct(barcode: string, price: number) {
  const response = await fetchWithAuth(buildUrl("/alamcen/productos/manual"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      barcode,
      price
    })
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  const product = (await response.json()) as BarcodeProductLookup;
  setCachedLookup(barcode, product);
  return product;
}

export async function updateProduct(productId: number, payload: { nombre: string; precioVenta: number }) {
  const response = await fetchWithAuth(buildUrl(`/alamcen/productos/${productId}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  const product = (await response.json()) as BarcodeProductLookup;
  refreshCachedLookupByProduct(product);
  return product;
}

export async function createSale(payload: AlamcenSalePayload) {
  const response = await fetchWithAuth(buildUrl("/alamcen/sales"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as {
    ok: true;
    sale: {
      id: number;
      externalId: string | null;
      totalAmount: number;
      itemsCount: number;
      createdAt: string;
    };
  };
}

export function queueSaleForBackgroundSync(payload: AlamcenSalePayload) {
  const queuedSale: PendingQueuedSale = {
    id: `${payload.externalId || "alamcen-sale"}-${Date.now()}`,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    payload
  };

  const queue = readPendingSalesQueue();
  queue.push(queuedSale);
  writePendingSalesQueue(queue);
  void flushPendingSalesQueue().catch((error) => {
    console.error("[alamcen-sales-queue] No pudimos guardar una venta en segundo plano.", error);
  });
  return queuedSale.id;
}

export async function flushPendingSalesQueue() {
  if (inflightSalesQueueFlush) {
    return inflightSalesQueueFlush;
  }

  inflightSalesQueueFlush = (async () => {
    let queue = readPendingSalesQueue();

    while (queue.length > 0) {
      const [nextSale, ...rest] = queue;

      try {
        await createSale(nextSale.payload);
        queue = rest;
        writePendingSalesQueue(queue);
      } catch (error) {
        queue = [
          {
            ...nextSale,
            attempts: nextSale.attempts + 1
          },
          ...rest
        ];
        writePendingSalesQueue(queue);
        throw error;
      }
    }
  })();

  try {
    await inflightSalesQueueFlush;
  } finally {
    inflightSalesQueueFlush = null;
  }
}

export async function createPayment(payload: { externalId?: string; amount: number; description: string }) {
  const response = await fetchWithAuth(buildUrl("/alamcen/payments"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as {
    ok: true;
    payment: {
      id: number;
      externalId: string | null;
      amount: number;
      description: string | null;
      createdAt: string;
    };
  };
}

export async function fetchDashboard() {
  const response = await fetchWithAuth(buildUrl("/alamcen/dashboard"));

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as AlamcenDashboardPayload;
}
