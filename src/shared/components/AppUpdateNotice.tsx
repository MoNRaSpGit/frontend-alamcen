import { useEffect, useState } from "react";
import { onAppUpdateReady, applyAppUpdate } from "../pwa/sw-updates";

export function AppUpdateNotice() {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAppUpdateReady(() => {
      setIsVisible(true);
      setIsUpdating(false);
    });

    return () => {
      unsubscribe();
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
