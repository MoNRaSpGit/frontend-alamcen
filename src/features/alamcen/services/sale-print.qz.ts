import qz from "qz-tray";
import type { SalePrintPayload } from "./sale-print.types";

const TICKET_WIDTH = 42;
let cachedPrinterName = "";

function money(value: number) {
  return Number(value || 0).toFixed(0);
}

function formatWhen(isoDate?: string) {
  const date = isoDate ? new Date(isoDate) : new Date();
  return date.toLocaleString("es-UY", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function padLine(left = "", rightValue = "", width = TICKET_WIDTH) {
  const leftText = String(left || "");
  const rightText = String(rightValue || "");
  const free = Math.max(1, width - rightText.length);
  return `${leftText.slice(0, free)}${" ".repeat(Math.max(1, width - leftText.slice(0, free).length - rightText.length))}${rightText}`;
}

function formatCols(product: string, qty: number, subtotal: string) {
  const productText = String(product || "").slice(0, 24).padEnd(24, " ");
  const qtyText = String(qty || "").slice(0, 6).padStart(6, " ");
  const subtotalText = String(subtotal || "").slice(0, 12).padStart(12, " ");
  return `${productText}${qtyText}${subtotalText}`;
}

function divider() {
  return "-".repeat(TICKET_WIDTH);
}

function pickPrinterName(printers: string[] = []) {
  const list = Array.isArray(printers) ? printers : [];
  const physical = list.filter((name) => !/pdf|xps|onenote|fax|microsoft print to pdf/i.test(String(name || "")));
  if (!physical.length) {
    return "";
  }

  const preferred = physical.find((name) => /xprinter|xp-|pos|thermal|receipt/i.test(String(name || "")));
  return preferred || physical[0];
}

async function ensureQzConnected() {
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
}

function buildRawTicket(payload: SalePrintPayload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const lines: string[] = [];

  lines.push("\x1B\x40");
  lines.push("\x1B\x61\x01");
  lines.push(`${String(payload.storeName || "Almacen")}\n`);
  lines.push(`Ticket: ${payload.externalId || "-"}\n`);
  lines.push(`Fecha: ${formatWhen(payload.chargedAtIso)}\n`);
  lines.push(`Operario: ${payload.operatorName || "Operario"}\n`);
  if (payload.paymentMethodLabel) {
    lines.push(`Pago: ${payload.paymentMethodLabel}\n`);
  }
  if (payload.customerName) {
    lines.push(`Cuenta: ${payload.customerName}\n`);
  }
  if (payload.notes) {
    lines.push(`${payload.notes}\n`);
  }
  lines.push("\x1B\x61\x00");
  lines.push(`${divider()}\n`);
  lines.push(`${formatCols("Producto", 0, "Subtotal")}\n`);
  lines.push(`${divider()}\n`);

  items.forEach((item) => {
    const qty = Number(item.quantity || 1);
    const subtotal = qty * Number(item.price || 0);
    lines.push(`${formatCols(String(item.name || "Producto"), qty, `$${money(subtotal)}`)}\n`);
  });

  lines.push(`${divider()}\n`);
  lines.push(`${padLine("TOTAL", `$${money(payload.total || 0)}`)}\n`);
  lines.push(`${divider()}\n`);
  lines.push("\x1B\x61\x01");
  lines.push("Gracias por su compra\n");
  lines.push("\n\n\n");
  if (payload.openCashDrawer) {
    lines.push("\x1B\x70\x00\x19\xFA");
  }
  lines.push("\x1D\x56\x41\x00");

  return lines;
}

export async function printSaleReceiptWithQz(payload: SalePrintPayload) {
  await ensureQzConnected();
  const data = buildRawTicket(payload);

  const attemptPrinter = async (printerName: string) => {
    const config = qz.configs.create(printerName, { encoding: "CP437" });
    await qz.print(config, data);
    cachedPrinterName = printerName;
    return { printerName };
  };

  if (cachedPrinterName) {
    try {
      return await attemptPrinter(cachedPrinterName);
    } catch {
      // Intentamos descubrir una impresora nueva una sola vez.
    }
  }

  const printers = await qz.printers.find();
  const printerName = pickPrinterName(printers);
  if (!printerName) {
    const detected = Array.isArray(printers) && printers.length ? printers.join(", ") : "ninguna";
    throw new Error(`QZ no encontro una impresora termica (Xprinter/POS). Detectadas: ${detected}`);
  }

  return attemptPrinter(printerName);
}
