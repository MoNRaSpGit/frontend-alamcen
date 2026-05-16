import { useEffect, useState } from "react";
import { applyAppUpdate, onAppUpdateReady } from "../pwa/sw-updates";

export function AppUpdateNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    return onAppUpdateReady(() => {
      setIsVisible(true);
    });
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="app-update-notice" role="status" aria-live="polite">
      <div className="app-update-copy">
        <strong>Hay una nueva actualizacion</strong>
        <span>Recarga la app para usar la ultima version.</span>
      </div>
      <button
        type="button"
        className="app-update-button"
        onClick={() => {
          setIsVisible(false);
          applyAppUpdate();
        }}
      >
        Actualizar
      </button>
    </div>
  );
}
