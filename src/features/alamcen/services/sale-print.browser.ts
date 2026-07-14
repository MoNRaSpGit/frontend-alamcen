import type { SalePrintPayload } from "./sale-print.types";

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: number) {
  return new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 }).format(Number(value || 0));
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

function buildReceiptHtml(payload: SalePrintPayload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const rows = items
    .map((item) => {
      const name = escapeHtml(item.name || "Producto");
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price || 0);
      const lineTotal = Number(item.subtotal || quantity * unitPrice);

      return `
        <div class="alamcen-receipt-row">
          <div class="alamcen-receipt-name">${name}</div>
          <div class="alamcen-receipt-cols">
            <span>${quantity}</span>
            <span>$${money(unitPrice)}</span>
            <span>$${money(lineTotal)}</span>
          </div>
        </div>
      `;
    })
    .join("");

  const customerLine = payload.customerName ? `<div class="alamcen-receipt-meta">Cuenta: ${escapeHtml(payload.customerName)}</div>` : "";
  const methodLine = payload.paymentMethodLabel
    ? `<div class="alamcen-receipt-meta">Pago: ${escapeHtml(payload.paymentMethodLabel)}</div>`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket ${escapeHtml(payload.externalId || "")}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      width: 74mm;
      font-family: Consolas, "Lucida Console", "Courier New", monospace;
      color: #111;
      font-size: 11px;
      line-height: 1.25;
      padding-bottom: 5mm;
      margin: 0 auto;
    }
    .center { text-align: center; }
    .title { font-size: 15px; font-weight: 700; margin-bottom: 1mm; }
    .meta { font-size: 10px; margin-bottom: 1mm; }
    .divider { border-top: 1px dashed #000; margin: 2mm 0; }
    .head-cols,
    .alamcen-receipt-cols {
      display: grid;
      grid-template-columns: 40% 20% 20% 20%;
      gap: 1mm;
      align-items: baseline;
    }
    .head-cols {
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 1mm;
    }
    .alamcen-receipt-row { margin-bottom: 1.5mm; }
    .alamcen-receipt-name {
      font-weight: 700;
      margin-bottom: 0.5mm;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .alamcen-receipt-cols span:nth-child(2),
    .alamcen-receipt-cols span:nth-child(3) {
      text-align: right;
    }
    .total {
      display: grid;
      grid-template-columns: 50% 50%;
      font-size: 16px;
      font-weight: 700;
    }
    .total-label { text-align: left; }
    .total-value { text-align: right; }
    .footer {
      margin-top: 3mm;
      text-align: center;
      font-size: 10px;
    }
    .notes { font-size: 10px; margin-top: 1mm; }
  </style>
</head>
<body>
  <div class="center title">${escapeHtml(payload.storeName || "Almacen")}</div>
  <div class="center meta">Ticket: ${escapeHtml(payload.externalId || "-")}</div>
  <div class="center meta">Fecha: ${escapeHtml(formatWhen(payload.chargedAtIso))}</div>
  <div class="center meta">Operario: ${escapeHtml(payload.operatorName || "Operario")}</div>
  ${methodLine}
  ${customerLine}
  ${payload.notes ? `<div class="center notes">${escapeHtml(payload.notes)}</div>` : ""}

  <div class="divider"></div>

  <div class="head-cols">
    <span>Producto</span>
    <span style="text-align:right;">Cant</span>
    <span style="text-align:right;">P.Unit</span>
    <span style="text-align:right;">Subtotal</span>
  </div>

  ${rows}

  <div class="divider"></div>

  <div class="total">
    <span class="total-label">TOTAL</span>
    <span class="total-value">$${money(payload.total || 0)}</span>
  </div>

  <div class="divider"></div>
  <div class="footer">Gracias por su compra</div>
</body>
</html>`;
}

export async function printSaleReceiptWithBrowser(payload: SalePrintPayload) {
  if (typeof window === "undefined") {
    throw new Error("Impresion no disponible fuera del navegador.");
  }

  const printWindow = window.open("", "_blank", "width=420,height=700");
  if (!printWindow) {
    throw new Error("No se pudo abrir la ventana de impresion. Revisa el bloqueo de popups.");
  }

  const html = buildReceiptHtml(payload);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  await new Promise<void>((resolve) => {
    const onLoad = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
        resolve();
      }, 300);
    };

    if (printWindow.document.readyState === "complete") {
      onLoad();
      return;
    }

    printWindow.addEventListener("load", onLoad, { once: true });
  });
}
