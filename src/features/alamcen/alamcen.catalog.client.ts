import { apiConfig } from "../../shared/config/api";
import { BarcodeProductLookup } from "./alamcen.types";

function buildUrl(path: string) {
  const baseUrl = apiConfig.baseUrl.replace(/\/$/, "");
  return `${baseUrl}${path}`;
}

export async function findProductByBarcode(barcode: string) {
  const response = await fetch(buildUrl(`/alamcen/productos/barcode/${encodeURIComponent(barcode)}`));

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as BarcodeProductLookup | null;
}

export async function createManualProduct(barcode: string, price: number) {
  const response = await fetch(buildUrl("/alamcen/productos/manual"), {
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
    throw new Error("No se pudo crear el producto manual.");
  }

  return (await response.json()) as BarcodeProductLookup;
}

export async function updateProduct(productId: number, payload: { nombre: string; precioVenta: number }) {
  const response = await fetch(buildUrl(`/alamcen/productos/${productId}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar el producto.");
  }

  return (await response.json()) as BarcodeProductLookup;
}
