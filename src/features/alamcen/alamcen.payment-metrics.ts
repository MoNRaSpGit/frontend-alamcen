import { readJsonStorage, writeJsonStorage } from "../../shared/lib/persistence";

const PAYMENT_METRICS_KEY = "alamcen-payment-method-metrics-v1";
const URUGUAY_TIME_ZONE = "America/Montevideo";

type PaymentMetricsByDay = Record<
  string,
  {
    tarjeta: number;
    cuenta: number;
  }
>;

function getTodayKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: URUGUAY_TIME_ZONE
  }).format(new Date());
}

function readAllMetrics() {
  return readJsonStorage<PaymentMetricsByDay>(PAYMENT_METRICS_KEY, {});
}

export function recordCheckoutPaymentMethod(amount: number, method: "tarjeta" | "cuenta" | "efectivo") {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  if (method !== "tarjeta" && method !== "cuenta") {
    return;
  }

  const dayKey = getTodayKey();
  const current = readAllMetrics();
  const currentDay = current[dayKey] || { tarjeta: 0, cuenta: 0 };

  writeJsonStorage<PaymentMetricsByDay>(PAYMENT_METRICS_KEY, {
    ...current,
    [dayKey]: {
      tarjeta: currentDay.tarjeta + (method === "tarjeta" ? amount : 0),
      cuenta: currentDay.cuenta + (method === "cuenta" ? amount : 0)
    }
  });
}

export function loadTodayPaymentMetrics() {
  const dayKey = getTodayKey();
  const current = readAllMetrics();
  return current[dayKey] || { tarjeta: 0, cuenta: 0 };
}
