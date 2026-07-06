import { useEffect, useState } from "react";
import { fetchPublishedFrontendBuildMeta, getCurrentFrontendBuildMeta } from "../config/build";
import { applyAppUpdate } from "../pwa/sw-updates";

const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 1000;

export function AppUpdateNotice() {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkForUpdates() {
      try {
        const current = getCurrentFrontendBuildMeta();
        const published = await fetchPublishedFrontendBuildMeta();
        if (!mounted) {
          return;
        }

        setIsVisible(Boolean(published.bundleId && current.bundleId && published.bundleId !== current.bundleId));
      } catch {
        if (mounted) {
          setIsVisible(false);
        }
      }
    }

    void checkForUpdates();

    const intervalId = window.setInterval(() => {
      void checkForUpdates();
    }, UPDATE_CHECK_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdates();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  function handleUpdate() {
    setIsUpdating(true);
    window.setTimeout(() => {
      applyAppUpdate();
    }, 500);
  }

  if (!isVisible && !isUpdating) {
    return null;
  }

  return (
    <div className="app-update-notice" role="status" aria-live="polite">
      <div className="app-update-copy">
        <strong>{isUpdating ? "Actualizando..." : "Hay una nueva version disponible"}</strong>
        <span>{isUpdating ? "Aplicando la ultima version..." : "Actualiza la app para ver los ultimos cambios."}</span>
      </div>
      {!isUpdating ? (
        <button type="button" className="app-update-button" onClick={handleUpdate}>
          Actualizar
        </button>
      ) : null}
    </div>
  );
}
