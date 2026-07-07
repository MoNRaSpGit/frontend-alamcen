import { SaleLine } from "./alamcen.scanner.types";

const STOCK_STORAGE_KEY = "alamcen-demo-stock-v1";
const DEFAULT_INITIAL_STOCK = 10;

export type StockIntensity = "normal" | "warning" | "critical";

export type TrackedStockItem = {
  productId: number;
  barcode: string | null;
  name: string;
  image: string | null;
  quantity: number;
  initialQuantity: number;
  lastSoldAt: string | null;
  lastUpdatedAt: string;
};

export type StockUpdateInput = {
  productId: number;
  quantity: number;
  name?: string;
  barcode?: string | null;
  image?: string | null;
};

type StoredStockPayload = {
  items: TrackedStockItem[];
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeItems(items: TrackedStockItem[]) {
  return [...items].sort((a, b) => {
    if (a.quantity !== b.quantity) {
      return a.quantity - b.quantity;
    }

    return a.name.localeCompare(b.name, "es-UY");
  });
}

function normalizeBarcode(value: string | null | undefined) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function readStock(): TrackedStockItem[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STOCK_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredStockPayload | TrackedStockItem[];
    const items = Array.isArray(parsed) ? parsed : parsed.items;

    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter((item): item is TrackedStockItem => {
        return Boolean(item)
          && typeof item.productId === "number"
          && ("barcode" in item ? typeof item.barcode === "string" || item.barcode === null : true)
          && typeof item.name === "string"
          && typeof item.quantity === "number"
          && typeof item.initialQuantity === "number";
      })
      .map((item) => ({
        ...item,
        barcode: typeof item.barcode === "string" ? item.barcode : null,
        image: typeof item.image === "string" ? item.image : null,
        lastSoldAt: typeof item.lastSoldAt === "string" ? item.lastSoldAt : null,
        lastUpdatedAt: typeof item.lastUpdatedAt === "string" ? item.lastUpdatedAt : new Date().toISOString()
      }));
  } catch {
    return [];
  }
}

function writeStock(items: TrackedStockItem[]) {
  if (!canUseStorage()) {
    return;
  }

  const payload: StoredStockPayload = { items: normalizeItems(items) };
  window.localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(payload));
}

function upsertSaleLine(items: TrackedStockItem[], line: SaleLine, nowIso: string) {
  if (line.productId <= 0) {
    return items;
  }

  const existingIndex = items.findIndex((item) => item.productId === line.productId);

  if (existingIndex === -1) {
    return [
      {
        productId: line.productId,
        barcode: normalizeBarcode(line.barcode),
        name: line.name,
        image: line.image,
        quantity: Math.max(0, DEFAULT_INITIAL_STOCK - line.quantity),
        initialQuantity: DEFAULT_INITIAL_STOCK,
        lastSoldAt: nowIso,
        lastUpdatedAt: nowIso
      },
      ...items
    ];
  }

  return items.map((item, index) => {
    if (index !== existingIndex) {
      return item;
    }

    return {
      ...item,
      barcode: item.barcode || normalizeBarcode(line.barcode),
      name: line.name,
      image: line.image ?? item.image,
      quantity: Math.max(0, item.quantity - line.quantity),
      lastSoldAt: nowIso,
      lastUpdatedAt: nowIso
    };
  });
}

export function loadTrackedStock() {
  return normalizeItems(readStock());
}

export function updateTrackedStockItem(payload: StockUpdateInput) {
  const nowIso = new Date().toISOString();
  const normalizedQuantity = Number.isFinite(payload.quantity) ? Math.max(0, Math.floor(payload.quantity)) : 0;
  const currentItems = readStock();
  const nextItems = currentItems.map((item) =>
    item.productId === payload.productId
      ? {
          ...item,
          quantity: normalizedQuantity,
          lastUpdatedAt: nowIso
        }
      : item
  );

  if (nextItems.some((item) => item.productId === payload.productId)) {
    writeStock(nextItems);
    return normalizeItems(nextItems);
  }

  const nextWithUpsert = [
    {
      productId: payload.productId,
      barcode: normalizeBarcode(payload.barcode),
      name: payload.name || `Producto ${payload.productId}`,
      image: payload.image ?? null,
      quantity: normalizedQuantity,
      initialQuantity: normalizedQuantity,
      lastSoldAt: null,
      lastUpdatedAt: nowIso
    },
    ...nextItems
  ];

  writeStock(nextWithUpsert);
  return normalizeItems(nextWithUpsert);
}

export function findTrackedStockItem(items: TrackedStockItem[], query: string) {
  const normalizedQuery = normalizeBarcode(query);
  if (!normalizedQuery) {
    return null;
  }

  const byBarcode = items.find((item) => normalizeBarcode(item.barcode) === normalizedQuery);
  if (byBarcode) {
    return byBarcode;
  }

  const loweredQuery = normalizedQuery.toLowerCase();
  return items.find((item) => item.name.toLowerCase().includes(loweredQuery)) || null;
}

export function recordStockSale(lines: SaleLine[]) {
  const nowIso = new Date().toISOString();
  const nextItems = lines.reduce((items, line) => upsertSaleLine(items, line, nowIso), readStock());
  writeStock(nextItems);
  return normalizeItems(nextItems);
}

export function getStockIntensity(quantity: number): StockIntensity {
  if (quantity < 3) {
    return "critical";
  }

  if (quantity < 6) {
    return "warning";
  }

  return "normal";
}

export function getStockLabel(quantity: number) {
  switch (getStockIntensity(quantity)) {
    case "critical":
      return "Crítico";
    case "warning":
      return "Bajo";
    default:
      return "Normal";
  }
}

export function clearTrackedStock() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STOCK_STORAGE_KEY);
}
