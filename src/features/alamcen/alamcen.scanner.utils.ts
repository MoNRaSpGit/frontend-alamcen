import { SaleLine } from "./alamcen.scanner.types";

type LookupProduct = {
  id: number;
  barcode?: string | null;
  barcodeNormalized?: string | null;
  nombre: string;
  precioVenta: number;
  imagen: string | null;
  tieneImagen: boolean;
};

export function formatCurrency(value: number) {
  const formattedValue = new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: 0
  }).format(value);

  return `$ ${formattedValue}`;
}

export function buildLookupErrorMessage(error: unknown, apiBaseUrl: string) {
  if (error instanceof Error) {
    const normalizedMessage = error.message.trim();

    if (!normalizedMessage || normalizedMessage === "Failed to fetch") {
      return `No pudimos consultar productos. Revisa la API activa (${apiBaseUrl}) y la conexion al backend.`;
    }

    return `No pudimos consultar productos. ${normalizedMessage}`;
  }

  return `No pudimos consultar productos. Revisa la API activa (${apiBaseUrl}) y la conexion al backend.`;
}

export function appendProductToSale(current: SaleLine[], product: LookupProduct) {
  const existingLine = current.find((line) => line.productId === product.id);
  if (existingLine) {
    return current.map((line) =>
      line.productId === product.id
        ? {
            ...line,
            quantity: line.quantity + 1,
            subtotal: (line.quantity + 1) * line.price
          }
        : line
    );
  }

  return [
    {
      productId: product.id,
      barcode: product.barcodeNormalized || product.barcode || null,
      name: product.nombre,
      price: product.precioVenta,
      quantity: 1,
      subtotal: product.precioVenta,
      image: product.tieneImagen ? product.imagen : null
    },
    ...current
  ];
}

export function applyEditedProduct(current: SaleLine[], productId: number, payload: { nombre: string; precioVenta: number }) {
  return current.map((line) =>
    line.productId === productId
      ? {
          ...line,
          name: payload.nombre,
          price: payload.precioVenta,
          subtotal: line.quantity * payload.precioVenta
        }
      : line
  );
}

export function appendLocalManualProduct(current: SaleLine[], price: number) {
  return appendProductToSale(current, {
    id: Date.now() * -1,
    barcode: null,
    nombre: "Producto Manual",
    precioVenta: price,
    imagen: null,
    tieneImagen: false
  });
}

export function removeSaleLine(current: SaleLine[], productId: number) {
  return current.flatMap((line) => {
    if (line.productId !== productId) {
      return [line];
    }

    if (line.quantity <= 1) {
      return [];
    }

    return [
      {
        ...line,
        quantity: line.quantity - 1,
        subtotal: (line.quantity - 1) * line.price
      }
    ];
  });
}

export function increaseSaleLine(current: SaleLine[], productId: number) {
  return current.map((line) =>
    line.productId === productId
      ? {
          ...line,
          quantity: line.quantity + 1,
          subtotal: (line.quantity + 1) * line.price
        }
      : line
  );
}

export function parsePriceInput(value: string) {
  return Number(value.replace(",", "."));
}
