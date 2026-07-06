import { AuthFetchMetrics } from "../auth/auth.client";
import { BarcodeLookupMetrics } from "./alamcen.catalog.client";

const ENABLE_ALAMCEN_DIAGNOSTICS = import.meta.env.DEV;

function logDiagnostic(payload: Record<string, unknown>) {
  if (!ENABLE_ALAMCEN_DIAGNOSTICS) {
    return;
  }

  console.log(JSON.stringify(payload));
}

export function warnWarmupFailure(error: unknown) {
  if (!ENABLE_ALAMCEN_DIAGNOSTICS) {
    return;
  }

  console.warn("[alamcen-warmup] No pudimos precalentar la caja.", error);
}

export function warnPrimeCacheFailure(error: unknown) {
  if (!ENABLE_ALAMCEN_DIAGNOSTICS) {
    return;
  }

  console.warn("[alamcen-cache] No pudimos precargar productos para acelerar la primera lectura.", error);
}

export function logScannerWarmup(payload: {
  statusMs: number;
  scannerRouteMs: number;
  totalMs: number;
  statusAuth: AuthFetchMetrics | null;
  scannerRouteAuth: AuthFetchMetrics | null;
}) {
  logDiagnostic({
    context: "alamcen-scanner-warmup",
    ...payload,
    measuredAt: new Date().toISOString()
  });
}

export function logScanResult(barcode: string, productName: string | null, found: boolean, durationMs: number, metrics: BarcodeLookupMetrics) {
  logDiagnostic({
    context: "alamcen-scan-result",
    barcode,
    found,
    productName,
    durationMs,
    breakdown: {
      cacheHit: metrics.cacheHit,
      sharedInflight: metrics.sharedInflight,
      cacheReadMs: metrics.cacheReadMs,
      networkMs: metrics.networkMs,
      parseMs: metrics.parseMs,
      cacheWriteMs: metrics.cacheWriteMs,
      auth: metrics.auth
        ? {
            hadAccessToken: metrics.auth.hadAccessToken,
            authPath: metrics.auth.authPath,
            firstRequestMs: metrics.auth.firstRequestMs,
            refreshMs: metrics.auth.refreshMs,
            retryAfterRefreshMs: metrics.auth.retryAfterRefreshMs,
            autoLoginMs: metrics.auth.autoLoginMs,
            retryAfterAutoLoginMs: metrics.auth.retryAfterAutoLoginMs,
            finalStatus: metrics.auth.finalStatus
          }
        : null
    },
    measuredAt: new Date().toISOString()
  });
}

export function logScanUi(barcode: string, productName: string, uiMs: number, totalMeasuredMs: number) {
  logDiagnostic({
    context: "alamcen-scan-ui",
    barcode,
    productName,
    uiMs,
    totalMeasuredMs,
    measuredAt: new Date().toISOString()
  });
}
