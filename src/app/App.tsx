import { useEffect, useMemo, useState } from "react";
import { ToastContainer } from "react-toastify";
import { LoginPage } from "../features/auth/LoginPage";
import { autoLoginRamon, getAccessToken, getStoredUser } from "../features/auth/auth.client";
import { AppUpdateNotice } from "../shared/components/AppUpdateNotice";
import { AlamcenWorkspace } from "../features/alamcen/AlamcenWorkspace";

const ALAMCEN_EXIT_FLAG = "saaspro_alamcen_exit_requested";

export function App() {
  const [sessionVersion, setSessionVersion] = useState(0);
  const [isBootstrappingSession, setIsBootstrappingSession] = useState(true);
  const [isExitRequested, setIsExitRequested] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(ALAMCEN_EXIT_FLAG) === "1";
  });
  const token = getAccessToken();
  const currentUser = useMemo(() => getStoredUser(), [sessionVersion]);

  const canAccessModule = Boolean(currentUser?.tenantContext?.modules.includes("alamcen"));

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      try {
        if (isExitRequested) {
          return;
        }

        if (!token || !currentUser) {
          await autoLoginRamon();
          if (!cancelled) {
            setSessionVersion((current) => current + 1);
          }
        }
      } catch {
        // Let the login page render as fallback when auto-login fails.
      } finally {
        if (!cancelled) {
          setIsBootstrappingSession(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [currentUser, isExitRequested, token]);

  useEffect(() => {
    if (!isExitRequested || typeof window === "undefined") {
      return;
    }

    window.setTimeout(() => {
      window.close();
      window.location.replace("about:blank");
    }, 20);
  }, [isExitRequested]);

  function handleLoggedOut() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ALAMCEN_EXIT_FLAG, "1");
    }

    setIsExitRequested(true);
    setSessionVersion((current) => current + 1);
  }

  return (
    <>
      <AppUpdateNotice />
      <ToastContainer position="top-right" autoClose={2400} newestOnTop closeOnClick pauseOnFocusLoss={false} />
      {isExitRequested ? null : isBootstrappingSession ? (
        <main className="auth-screen">
          <section className="auth-card">
            <div className="auth-copy">
              <p className="auth-kicker">SaaS Pro</p>
              <h1>Almacen</h1>
              <p>Iniciando sesion...</p>
            </div>
          </section>
        </main>
      ) : !token || !currentUser ? (
        <LoginPage onLoggedIn={() => setSessionVersion((current) => current + 1)} />
      ) : canAccessModule ? (
        <AlamcenWorkspace onLoggedOut={handleLoggedOut} />
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
