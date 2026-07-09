export type DemoCustomer = {
  id: string;
  name: string;
  phone: string;
  debtTotal: number;
  lastSale: string;
  sales: Array<{
    id: string;
    amount: number;
    items: string;
    date: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    note: string;
    date: string;
  }>;
};

export const CUSTOMER_PREVIEW: DemoCustomer[] = [
  {
    id: "lucia",
    name: "Juan",
    phone: "099 000 000",
    debtTotal: 2450,
    lastSale: "Hoy 14:20",
    sales: [
      { id: "lucia-sale-1", amount: 1250, items: "Yerba, azucar, leche", date: "Hoy 14:20" },
      { id: "lucia-sale-2", amount: 1200, items: "Fiambre y pan", date: "Ayer 18:05" }
    ],
    payments: [{ id: "lucia-payment-1", amount: 1000, note: "Pago parcial", date: "Ayer 19:10" }]
  },
  {
    id: "claudia",
    name: "Ana",
    phone: "098 111 222",
    debtTotal: 780,
    lastSale: "Ayer 11:12",
    sales: [{ id: "claudia-sale-1", amount: 780, items: "Limpieza y bebidas", date: "Ayer 11:12" }],
    payments: []
  },
  {
    id: "oriol",
    name: "Pablo",
    phone: "097 333 444",
    debtTotal: 0,
    lastSale: "Sin deuda",
    sales: [],
    payments: [{ id: "oriol-payment-1", amount: 1500, note: "Cancelacion", date: "Lun 09:45" }]
  }
];
