export type SaleLine = {
  productId: number;
  barcode?: string | null;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image: string | null;
};

export type ManualModalMode = "barcode-miss" | "manual-button";
