import type { SaleLine } from "../alamcen.scanner.types";

export type SalePrintPayload = {
  storeName?: string;
  externalId?: string;
  operatorName?: string;
  chargedAtIso?: string;
  paymentMethodLabel?: string;
  customerName?: string;
  notes?: string;
  items?: Array<Pick<SaleLine, "name" | "price" | "quantity" | "subtotal">>;
  total?: number;
};
