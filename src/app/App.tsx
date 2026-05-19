import { useMemo, useState } from "react";
import { LoginPage } from "../features/auth/LoginPage";
import { getAccessToken, getStoredUser } from "../features/auth/auth.client";
import { AppUpdateNotice } from "../shared/components/AppUpdateNotice";
import { AlamcenWorkspace } from "../features/alamcen/AlamcenWorkspace";

export function App() {
  const [sessionVersion, setSessionVersion] = useState(0);
  const token = getAccessToken();
  const currentUser = useMemo(() => getStoredUser(), [sessionVersion]);

  const canAccessModule = Boolean(currentUser?.tenantContext?.modules.includes("alamcen"));

  return (
    <>
      <AppUpdateNotice />
      {!token || !currentUser ? (
        <LoginPage onLoggedIn={() => setSessionVersion((current) => current + 1)} />
      ) : canAccessModule ? (
        <AlamcenWorkspace currentUser={currentUser} onLoggedOut={() => setSessionVersion((current) => current + 1)} />
      ) : (
        <main className="auth-screen">
          <section className="auth-card">
            <div className="auth-copy">
              <p className="auth-kicker">Acceso denegado</p>
              <h1>Este usuario no tiene Almacen habilitado.</h1>
              <p>Activa el módulo desde SaaS Admin o entra con otro usuario del tenant.</p>
            </div>
          </section>
        </main>
      )}
    </>
  );
}
