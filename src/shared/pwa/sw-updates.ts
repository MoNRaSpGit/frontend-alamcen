const UPDATE_EVENT_NAME = "alamcen-pwa-update-ready";
const LAST_SEEN_BUILD_KEY = "alamcen-pwa-last-seen-build";

type UpdateHandler = () => void;

let waitingWorker: ServiceWorker | null = null;
let alreadyReloading = false;
let hasPendingUpdate = false;

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
}

async function unregisterLocalServiceWorkers() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

function notifyUpdateReady(worker: ServiceWorker | null) {
  waitingWorker = worker;
  hasPendingUpdate = true;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT_NAME));
}

function syncSeenBuildVersion() {
  if (typeof window === "undefined") {
    return;
  }

  const currentBuildId = __APP_BUILD_ID__;
  const previousBuildId = window.localStorage.getItem(LAST_SEEN_BUILD_KEY);

  if (previousBuildId && previousBuildId !== currentBuildId) {
    notifyUpdateReady(null);
  }

  window.localStorage.setItem(LAST_SEEN_BUILD_KEY, currentBuildId);
}

export function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const isLocalEnvironment =
    import.meta.env.DEV ||
    (typeof window !== "undefined" && isLocalHostname(window.location.hostname));

  if (isLocalEnvironment) {
    void unregisterLocalServiceWorkers();
    return;
  }

  syncSeenBuildVersion();

  window.addEventListener("load", async () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js?build=${encodeURIComponent(__APP_BUILD_ID__)}`;
    const registration = await navigator.serviceWorker.register(swUrl);

    void registration.update().catch(() => {});

    if (registration.waiting) {
      notifyUpdateReady(registration.waiting);
    }

    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) {
        return;
      }

      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
          notifyUpdateReady(installingWorker);
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (alreadyReloading) {
        return;
      }

      alreadyReloading = true;
      window.location.reload();
    });
  });
}

export function onAppUpdateReady(handler: UpdateHandler) {
  const wrappedHandler = () => handler();
  window.addEventListener(UPDATE_EVENT_NAME, wrappedHandler);

  if (hasPendingUpdate) {
    handler();
  }

  return () => {
    window.removeEventListener(UPDATE_EVENT_NAME, wrappedHandler);
  };
}

export function applyAppUpdate() {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    return;
  }

  window.location.reload();
}

export function previewAppUpdateNotice() {
  notifyUpdateReady(null);
}
