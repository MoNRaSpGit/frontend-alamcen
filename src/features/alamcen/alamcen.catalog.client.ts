import { fetchWithAuth, logoutSession } from "../auth/auth.client";
import { getApiBaseUrl } from "../../shared/config/api";
import { readJsonStorage, writeJsonStorage } from "../../shared/lib/persistence";
import { AlamcenDashboardPayload, AlamcenModuleStatus, AlamcenSalePayload, BarcodeProductLookup } from "./alamcen.types";

const PRODUCT_LOOKUP_CACHE_KEY = "alamcen.product-lookup-cache.v1";
const PRODUCT_LOOKUP_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const PRODUCT_LOOKUP_CACHE_MAX_ENTRIES = 250;

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

const inMemoryLookupCache = new Map<string, CachedLookupEntry>();
const inflightLookupRequests = new Map<string, Promise<BarcodeProductLookup | null>>();

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

export async function findProductByBarcode(barcode: string) {
  const normalizedBarcode = normalizeBarcode(barcode);
  if (!normalizedBarcode) {
    return null;
  }

  const cachedProduct = getCachedLookup(normalizedBarcode);
  if (cachedProduct) {
    return cachedProduct;
  }

  const inflightKey = `${getApiBaseUrl()}::${normalizedBarcode}`;
  const inflightRequest = inflightLookupRequests.get(inflightKey);
  if (inflightRequest) {
    return inflightRequest;
  }

  const requestPromise = (async () => {
    const response = await fetchWithAuth(buildUrl(`/alamcen/productos/barcode/${encodeURIComponent(normalizedBarcode)}`));

    if (!response.ok) {
      throw await buildApiError(response);
    }

    const product = await parseOptionalJson<BarcodeProductLookup>(response);
    if (product) {
      setCachedLookup(normalizedBarcode, product);
    }

    return product;
  })();

  inflightLookupRequests.set(inflightKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inflightLookupRequests.delete(inflightKey);
  }
}

export function clearProductLookupCache() {
  inMemoryLookupCache.clear();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PRODUCT_LOOKUP_CACHE_KEY);
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
