import type { SalePrintPayload } from "./sale-print.types";
import { printSaleReceiptWithBrowser } from "./sale-print.browser";
import { printSaleReceiptWithWebUsb } from "./sale-print.webusb";

async function tryPrintWithQz(payload: SalePrintPayload) {
  const { printSaleReceiptWithQz } = await import("./sale-print.qz");
  return printSaleReceiptWithQz(payload);
}

export async function printSaleReceipt(payload: SalePrintPayload) {
  try {
    await printSaleReceiptWithWebUsb(payload);
    return { method: "webusb" as const };
  } catch (webUsbError) {
    console.warn("[alamcen-print] WebUSB fallo, probando QZ.", webUsbError);
  }

  try {
    await tryPrintWithQz(payload);
    return { method: "qz" as const };
  } catch (qzError) {
    console.warn("[alamcen-print] QZ fallo, usando impresion del navegador.", qzError);
    await printSaleReceiptWithBrowser(payload);
    return { method: "browser" as const };
  }
}
