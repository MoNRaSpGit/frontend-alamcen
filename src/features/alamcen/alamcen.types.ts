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
}
