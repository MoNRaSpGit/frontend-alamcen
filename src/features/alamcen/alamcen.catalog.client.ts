import { getApiBaseUrl } from "../../shared/config/api";
import { BarcodeProductLookup } from "./alamcen.types";

async function buildApiError(response: Response) {
  let message = `Error ${response.status}`;

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      message = payload.message.join(", ");
    } else if (payload.message) {
      message = payload.message;
    }
  } catch {
    // Keep the generic status message if the response body is not JSON.
  }

  return new Error(message);
}

function buildUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${path}`;
}

export async function fetchAlamcenStatus() {
  const response = await fetch(buildUrl("/alamcen/status"));

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as {
    module: string;
    status: string;
    capabilities: string[];
    sourceTable: string;
  };
}

export async function findProductByBarcode(barcode: string) {
  const response = await fetch(buildUrl(`/alamcen/productos/barcode/${encodeURIComponent(barcode)}`));

  if (!response.ok) {
    throw await buildApiError(response);
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
    throw await buildApiError(response);
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
    throw await buildApiError(response);
  }

  return (await response.json()) as BarcodeProductLookup;
}
