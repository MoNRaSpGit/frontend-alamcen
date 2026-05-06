import { AlamcenView } from "./alamcen.types";

export const alamcenWorkspaceSections: Array<{ key: AlamcenView; label: string }> = [
  { key: "overview", label: "Inicio" },
  { key: "scanner", label: "Caja" },
  { key: "stock", label: "Stock" },
  { key: "movements", label: "Movimientos" },
  { key: "orders", label: "Pedidos" },
  { key: "questions", label: "Preguntas" }
];
