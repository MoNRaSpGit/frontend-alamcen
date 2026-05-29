import { fetchWithAuth, logoutSession } from "../auth/auth.client";
import { getApiBaseUrl } from "../../shared/config/api";
import { AlamcenDashboardPayload, AlamcenModuleStatus, AlamcenSalePayload, BarcodeProductLookup } from "./alamcen.types";

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
    // Keep generic message when response body is not JSON.
  }

  if (response.status === 401) {
    await logoutSession().catch(() => {});
  }

  return new Error(message);
}

function buildUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

async function parseOptionalJson<T>(response: Response) {
  const rawBody = await response.text();
  if (!rawBody.trim()) {
    return null;
  }

  return JSON.parse(rawBody) as T;
}

export async function fetchAlamcenStatus() {
  const response = await fetchWithAuth(buildUrl("/alamcen/status"));

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as AlamcenModuleStatus;
}

export async function listProducts(options: { search?: string; limit?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (options.search?.trim()) {
    searchParams.set("search", options.search.trim());
  }
  if (options.limit) {
    searchParams.set("limit", String(options.limit));
  }

  const query = searchParams.toString();
  const response = await fetchWithAuth(buildUrl(`/alamcen/products${query ? `?${query}` : ""}`));
  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as {
    count: number;
    items: BarcodeProductLookup[];
  };
}

export async function findProductByBarcode(barcode: string) {
  const response = await fetchWithAuth(buildUrl(`/alamcen/productos/barcode/${encodeURIComponent(barcode)}`));

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return await parseOptionalJson<BarcodeProductLookup>(response);
}

export async function createManualProduct(barcode: string, price: number) {
  const response = await fetchWithAuth(buildUrl("/alamcen/productos/manual"), {
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
  const response = await fetchWithAuth(buildUrl(`/alamcen/productos/${productId}`), {
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

export async function createSale(payload: AlamcenSalePayload) {
  const response = await fetchWithAuth(buildUrl("/alamcen/sales"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as {
    ok: true;
    sale: {
      id: number;
      externalId: string | null;
      totalAmount: number;
      itemsCount: number;
      createdAt: string;
    };
  };
}

export async function createPayment(payload: { externalId?: string; amount: number; description: string }) {
  const response = await fetchWithAuth(buildUrl("/alamcen/payments"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as {
    ok: true;
    payment: {
      id: number;
      externalId: string | null;
      amount: number;
      description: string | null;
      createdAt: string;
    };
  };
}

export async function fetchDashboard() {
  const response = await fetchWithAuth(buildUrl("/alamcen/dashboard"));

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as AlamcenDashboardPayload;
}
