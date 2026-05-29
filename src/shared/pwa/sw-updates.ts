const UPDATE_EVENT_NAME = "alamcen-pwa-update-ready";

type UpdateHandler = () => void;

let waitingWorker: ServiceWorker | null = null;
let alreadyReloading = false;

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
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT_NAME));
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

  window.addEventListener("load", async () => {
    const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);

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
