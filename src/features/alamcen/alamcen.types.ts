export type AlamcenView = "overview" | "scanner" | "stock" | "movements" | "orders" | "questions";

export interface WarehouseSite {
  id: string;
  name: string;
  location: string;
}

export interface ItemCategory {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  siteId: string;
  unit: string;
  quantity: number;
  minQuantity: number;
}

export interface InventoryMovement {
  id: string;
  date: string;
  siteId: string;
  itemId: string;
  direction: "in" | "out";
  quantity: number;
  reason: string;
}

export interface OrderDraft {
  id: string;
  code: string;
  siteId: string;
  supplier: string;
  status: "pendiente" | "recibido" | "parcial";
  total: number;
}

export interface MultipleChoiceQuestion {
  id: string;
  title: string;
  options: string[];
}

export interface BarcodeProductLookup {
  id: number;
  legacyProductoId: number | null;
  nombre: string;
  descripcion: string | null;
  barcode: string | null;
  barcodeNormalized: string | null;
  precioVenta: number;
  precioLista: number | null;
  stockActual: number;
  categoria: string | null;
  categoriaCompact: string | null;
  categoriaId: number | null;
  supplierId: number | null;
  subcategoria: string | null;
  tieneImagen: boolean;
  estado: "activo" | "inactivo" | "sin_stock" | "archivado";
  imagen: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlamcenModuleStatus {
  module: "alamcen";
  tenant: {
    id: number;
    name: string;
    slug: string;
  };
  user: {
    id: number;
    email: string;
    membershipRole: string;
  };
  backend: {
    database: "connected";
    currentTimestamp: string;
  };
  phase: "sprint-1";
  capabilities: string[];
}

export interface AlamcenSalePayload {
  externalId?: string;
  notes?: string;
  items: Array<{
    productId?: number | null;
    isManual?: boolean;
    nombre: string;
    precioVenta: number;
    quantity: number;
    thumbnailUrl?: string | null;
  }>;
}

export interface AlamcenDashboardPayload {
  ok: true;
  dashboard: {
    date: string;
    metrics: {
      initialCash: number;
      salesToday: number;
      currentAmount: number;
      paymentsTotal: number;
    };
    comparison: {
      today: number;
      yesterday: number;
      record: number;
    };
    movements: Array<{
      id: string;
      type: "Venta" | "Pago";
      amount: number;
      createdAt: string;
      detail: {
        kind: "sale" | "payment";
        description?: string | null;
        operator?: string;
        createdAt?: string;
        items?: Array<{
          id: number;
          name: string;
          quantity: number;
          lineTotal: number;
        }>;
      };
    }>;
    ranking: Array<{
      key: string;
      name: string;
      qty: number;
      thumbnailUrl: string | null;
    }>;
  };
}
