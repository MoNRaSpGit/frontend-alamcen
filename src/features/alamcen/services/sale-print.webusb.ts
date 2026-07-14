import type { SalePrintPayload } from "./sale-print.types";

type UsbDeviceLike = any;
type UsbPrinterPath = {
  interfaceNumber: number;
  alternateSetting: number;
  endpointNumber: number;
};

type UsbNavigatorLike = Navigator & {
  usb?: {
    getDevices(): Promise<UsbDeviceLike[]>;
    requestDevice(options: { filters: Array<Record<string, number>> }): Promise<UsbDeviceLike>;
  };
};

let cachedUsbPrinter: UsbDeviceLike | null = null;
let cachedUsbPath: UsbPrinterPath | null = null;

function getUsbApi() {
  if (typeof navigator === "undefined") {
    return null;
  }

  return (navigator as UsbNavigatorLike).usb ?? null;
}

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function encodeEscPosText(value: string) {
  const text = normalizeText(value);
  const bytes = new Uint8Array(text.length);

  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }

  return bytes;
}

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

function padLine(left = "", rightValue = "", width = 42) {
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

function buildReceiptBytes(payload: SalePrintPayload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const chunks: Uint8Array[] = [];

  const pushText = (text: string) => {
    chunks.push(encodeEscPosText(text));
  };

  const pushBytes = (...bytes: number[]) => {
    chunks.push(Uint8Array.from(bytes));
  };

  pushBytes(0x1b, 0x40);
  pushBytes(0x1b, 0x61, 0x01);
  pushText(`${String(payload.storeName || "Almacen")}\n`);
  pushText(`Ticket: ${String(payload.externalId || "-")}\n`);
  pushText(`Fecha: ${formatWhen(payload.chargedAtIso)}\n`);
  pushText(`Operario: ${String(payload.operatorName || "Operario")}\n`);

  if (payload.paymentMethodLabel) {
    pushText(`Pago: ${String(payload.paymentMethodLabel)}\n`);
  }

  if (payload.customerName) {
    pushText(`Cuenta: ${String(payload.customerName)}\n`);
  }

  if (payload.notes) {
    pushText(`${String(payload.notes)}\n`);
  }

  pushBytes(0x1b, 0x61, 0x00);
  pushText(`${"-".repeat(42)}\n`);
  pushText(`${formatCols("Producto", 0, "Subtotal")}\n`);
  pushText(`${"-".repeat(42)}\n`);

  items.forEach((item) => {
    const qty = Number(item.quantity || 1);
    const subtotal = qty * Number(item.price || 0);
    pushText(`${formatCols(String(item.name || "Producto"), qty, `$${money(subtotal)}`)}\n`);
  });

  pushText(`${"-".repeat(42)}\n`);
  pushText(`${padLine("TOTAL", `$${money(payload.total || 0)}`)}\n`);
  pushText(`${"-".repeat(42)}\n`);
  pushBytes(0x1b, 0x61, 0x01);
  pushText("Gracias por su compra\n");
  pushText("\n\n\n");

  if (payload.openCashDrawer) {
    pushBytes(0x1b, 0x70, 0x00, 0x19, 0xfa);
  }

  pushBytes(0x1d, 0x56, 0x41, 0x00);

  return chunks;
}

function findUsbPrinterPath(device: UsbDeviceLike) {
  const configuration = device?.configuration ?? device?.configurations?.[0] ?? null;
  const interfaces = configuration?.interfaces ?? [];

  for (const usbInterface of interfaces) {
    const alternates = usbInterface?.alternates ?? [];
    for (const alternate of alternates) {
      const endpoints = alternate?.endpoints ?? [];
      const outEndpoint = endpoints.find(
        (endpoint: any) => endpoint?.direction === "out" || endpoint?.type === "bulk" || endpoint?.endpointType === "bulk"
      );

      if (!outEndpoint) {
        continue;
      }

      return {
        interfaceNumber: Number(usbInterface?.interfaceNumber ?? usbInterface?.interface ?? 0),
        alternateSetting: Number(alternate?.alternateSetting ?? alternate?.alternate ?? 0),
        endpointNumber: Number(outEndpoint?.endpointNumber ?? outEndpoint?.endpoint ?? outEndpoint?.address ?? 0)
      } satisfies UsbPrinterPath;
    }
  }

  return null;
}

function pickAuthorizedUsbPrinter(devices: UsbDeviceLike[]) {
  const list = Array.isArray(devices) ? devices : [];
  if (!list.length) {
    return null;
  }

  const named = list.find((device) => {
    const label = `${device?.manufacturerName || ""} ${device?.productName || ""}`.toLowerCase();
    return /xprinter|xp-|thermal|receipt|pos/i.test(label);
  });

  return named || list[0] || null;
}

async function connectPrinter(device: UsbDeviceLike) {
  if (!device) {
    throw new Error("No se pudo acceder a la impresora USB.");
  }

  if (!device.opened) {
    await device.open();
  }

  if (device.configuration == null) {
    const configurationValue = device?.configurations?.[0]?.configurationValue ?? 1;
    await device.selectConfiguration(configurationValue);
  }

  const path = cachedUsbPath ?? findUsbPrinterPath(device);
  if (!path) {
    throw new Error("No encontramos un endpoint USB de salida para la impresora.");
  }

  try {
    await device.claimInterface(path.interfaceNumber);
  } catch {
    // Si ya estaba reclamada por una sesión previa, seguimos.
  }

  if (path.alternateSetting > 0 && typeof device.selectAlternateInterface === "function") {
    try {
      await device.selectAlternateInterface(path.interfaceNumber, path.alternateSetting);
    } catch {
      // Algunos dispositivos no exponen alternates seleccionables.
    }
  }

  cachedUsbPath = path;
  return { device, path };
}

async function writeChunks(device: UsbDeviceLike, endpointNumber: number, chunks: Uint8Array[]) {
  for (const chunk of chunks) {
    if (!chunk.length) {
      continue;
    }

    await device.transferOut(endpointNumber, chunk);
  }
}

export async function primeUsbPrinterConnection() {
  const usb = getUsbApi();
  if (!usb) {
    return null;
  }

  try {
    const devices = await usb.getDevices();
    cachedUsbPrinter = pickAuthorizedUsbPrinter(devices);
    return cachedUsbPrinter;
  } catch {
    return null;
  }
}

export async function printSaleReceiptWithWebUsb(payload: SalePrintPayload) {
  const usb = getUsbApi();
  if (!usb) {
    throw new Error("WebUSB no esta disponible en este navegador.");
  }

  if (!cachedUsbPrinter) {
    cachedUsbPrinter = await usb.requestDevice({ filters: [{ classCode: 7 }] });
  }

  const { device, path } = await connectPrinter(cachedUsbPrinter);
  const chunks = buildReceiptBytes(payload);

  try {
    await writeChunks(device, path.endpointNumber, chunks);
  } catch (error) {
    cachedUsbPrinter = null;
    cachedUsbPath = null;
    try {
      await device.close();
    } catch {
      // Ignoramos el cierre si el dispositivo ya se desconecto.
    }

    throw error;
  }

  return { deviceName: device?.productName || device?.manufacturerName || "USB printer" };
}
