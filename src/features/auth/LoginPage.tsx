import { FormEvent, useMemo, useState } from "react";
import { getApiBaseUrl, resetApiBaseUrl, setApiBaseUrl } from "../../shared/config/api";
import { AuthSession } from "./auth.types";
import { saveSession } from "./auth.client";

const DEMO_CREDENTIALS = {
  email: "almacen.demo@saaspro.com",
  password: "almacen123"
} as const;

type LoginPageProps = {
  onLoggedIn: () => void;
};

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiBaseUrl, setApiBaseUrlDraft] = useState(() => getApiBaseUrl());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const helperUrl = useMemo(() => getApiBaseUrl(), []);

  async function submitLogin(nextEmail: string, nextPassword: string) {
    setError("");
    setSubmitting(true);

    try {
      setApiBaseUrl(apiBaseUrl);
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: nextEmail.trim(),
          password: nextPassword
        })
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<AuthSession> & { message?: string };
      if (!response.ok || !payload.user || !payload.tokens) {
        throw new Error(payload.message || "No se pudo iniciar sesion.");
      }

      saveSession(payload as AuthSession);
      onLoggedIn();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo iniciar sesion.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitLogin(email, password);
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="auth-kicker">SaaS Pro</p>
          <h1>Almacen</h1>
          <p>Ingresa con un usuario del SaaS que tenga habilitado el módulo Almacen.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label className="auth-field">
            <span>Clave</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          <label className="auth-field">
            <span>API base</span>
            <input type="text" value={apiBaseUrl} onChange={(event) => setApiBaseUrlDraft(event.target.value)} />
          </label>

          <div className="auth-actions">
            <button
              type="button"
              className="auth-secondary-button"
              onClick={() => {
                resetApiBaseUrl();
                setApiBaseUrlDraft(getApiBaseUrl());
              }}
            >
              Reset API
            </button>
            <button
              type="button"
              className="auth-secondary-button"
              disabled={submitting}
              onClick={() => {
                setEmail(DEMO_CREDENTIALS.email);
                setPassword(DEMO_CREDENTIALS.password);
                void submitLogin(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
              }}
            >
              Entrar como invitado
            </button>
            <button type="submit" className="auth-primary-button" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>

        {error ? <p className="auth-error">{error}</p> : null}
        <p className="auth-helper">Base activa: {helperUrl}</p>
      </section>
    </main>
  );
}
