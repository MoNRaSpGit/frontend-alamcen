import { apiConfig } from "../../shared/config/api";
import { BarcodeProductLookup } from "./alamcen.types";

function buildUrl(path: string) {
  const baseUrl = apiConfig.baseUrl.replace(/\/$/, "");
  return `${baseUrl}${path}`;
}

export async function findProductByBarcode(barcode: string) {
  const response = await fetch(buildUrl(`/alamcen/productos/barcode/${encodeURIComponent(barcode)}`));

  if (!response.ok) {
    throw new Error("No se pudo consultar el producto.");
  }

  return (await response.json()) as BarcodeProductLookup | null;
}
