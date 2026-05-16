const UPDATE_EVENT_NAME = "alamcen-pwa-update-ready";

type UpdateHandler = () => void;

let waitingWorker: ServiceWorker | null = null;
let alreadyReloading = false;

function notifyUpdateReady(worker: ServiceWorker | null) {
  waitingWorker = worker;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT_NAME));
}

export function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) {
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
