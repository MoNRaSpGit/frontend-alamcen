import {
  InventoryItem,
  InventoryMovement,
  ItemCategory,
  MultipleChoiceQuestion,
  OrderDraft,
  WarehouseSite
} from "./alamcen.types";

export const sites: WarehouseSite[] = [
  { id: "site-1", name: "Deposito Central", location: "Montevideo" },
  { id: "site-2", name: "Sucursal Norte", location: "Durazno" }
];

export const categories: ItemCategory[] = [
  { id: "cat-1", name: "Bebidas" },
  { id: "cat-2", name: "Limpieza" },
  { id: "cat-3", name: "Envasados" }
];

export const items: InventoryItem[] = [
  { id: "item-1", sku: "BEB-001", name: "Agua 2L", categoryId: "cat-1", siteId: "site-1", unit: "botellas", quantity: 280, minQuantity: 90 },
  { id: "item-2", sku: "LIM-014", name: "Detergente 500ml", categoryId: "cat-2", siteId: "site-1", unit: "unidades", quantity: 74, minQuantity: 40 },
  { id: "item-3", sku: "ENV-103", name: "Arroz 1kg", categoryId: "cat-3", siteId: "site-2", unit: "paquetes", quantity: 198, minQuantity: 80 },
  { id: "item-4", sku: "BEB-021", name: "Jugo Naranja", categoryId: "cat-1", siteId: "site-2", unit: "cajas", quantity: 42, minQuantity: 25 }
];

export const movements: InventoryMovement[] = [
  { id: "mov-1", date: "2026-05-03", siteId: "site-1", itemId: "item-1", direction: "in", quantity: 120, reason: "Compra mayorista" },
  { id: "mov-2", date: "2026-05-04", siteId: "site-1", itemId: "item-2", direction: "out", quantity: 14, reason: "Salida a salon" },
  { id: "mov-3", date: "2026-05-05", siteId: "site-2", itemId: "item-3", direction: "out", quantity: 36, reason: "Venta mostrador" },
  { id: "mov-4", date: "2026-05-06", siteId: "site-2", itemId: "item-4", direction: "in", quantity: 20, reason: "Reposicion semanal" }
];

export const orders: OrderDraft[] = [
  { id: "ord-1", code: "PED-1004", siteId: "site-1", supplier: "Distribuidora Sur", status: "pendiente", total: 38400 },
  { id: "ord-2", code: "PED-1005", siteId: "site-2", supplier: "Mayorista Delta", status: "parcial", total: 16750 }
];

export const discoveryQuestions: MultipleChoiceQuestion[] = [
  { id: "stock-mode", title: "Quieren controlar solo stock actual o tambien historial completo de movimientos", options: ["Solo stock actual", "Tambien historial completo", "Depende del deposito"] },
  { id: "multi-site", title: "Van a manejar un solo deposito o varios depositos y sucursales", options: ["Un solo deposito", "Varios depositos", "Todavia no esta definido"] },
  { id: "reorder", title: "Quieren alertas cuando un producto quede bajo de stock", options: ["Si", "No", "Solo en algunos productos"] },
  { id: "orders-flow", title: "Los pedidos a proveedores quieren seguirlos dentro del sistema", options: ["Si completos", "Solo carga basica", "No por ahora"] },
  { id: "sales-link", title: "Las ventas o salidas deben descontar stock automaticamente", options: ["Si siempre", "A veces", "No por ahora"] },
  { id: "catalog-depth", title: "Los productos los quieren ordenar solo por categoria o tambien por marca y presentacion", options: ["Solo categoria", "Categoria, marca y presentacion", "Depende del rubro"] },
  { id: "inventory-count", title: "Van a necesitar hacer recuentos y ajustes de inventario", options: ["Si", "No", "Solo de vez en cuando"] }
];
