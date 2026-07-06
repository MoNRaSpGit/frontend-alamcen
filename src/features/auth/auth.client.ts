import { getApiBaseUrl, getDefaultApiBaseUrl, resetApiBaseUrl, setApiBaseUrl } from "../../shared/config/api";
import { AuthSession, AuthTokens, StoredAuthUser } from "./auth.types";

const ACCESS_TOKEN_KEY = "saaspro_alamcen_access_token";
const REFRESH_TOKEN_KEY = "saaspro_alamcen_refresh_token";
const USER_KEY = "saaspro_alamcen_user";

export const RAMON_CREDENTIALS = {
  email: "almacen@saaspro.local",
  password: "almacen123"
} as const;

function buildApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      ...session.user,
      tenantContext: session.tenantContext
    } satisfies StoredAuthUser)
  );
}

export function getStoredUser(): StoredAuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginWithCredentials(email: string, password: string, apiBaseUrl = getApiBaseUrl()) {
  setApiBaseUrl(apiBaseUrl);

  const response = await fetch(buildApiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim(),
      password
    })
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<AuthSession> & { message?: string };
  if (!response.ok || !payload.user || !payload.tokens) {
    throw new Error(payload.message || "No se pudo iniciar sesion.");
  }

  saveSession(payload as AuthSession);
  return payload as AuthSession;
}

export async function autoLoginRamon() {
  clearSession();

  const candidates = Array.from(new Set([getApiBaseUrl(), getDefaultApiBaseUrl()]));
  let lastError: Error | null = null;

  for (const apiBaseUrl of candidates) {
    try {
      return await loginWithCredentials(RAMON_CREDENTIALS.email, RAMON_CREDENTIALS.password, apiBaseUrl);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("No se pudo iniciar sesion.");
    }
  }

  resetApiBaseUrl();
  throw lastError || new Error("No se pudo iniciar sesion.");
}

export async function refreshSession(): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(buildApiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const payload = (await response.json()) as AuthSession;
  saveSession(payload);
  return payload.tokens;
}

export async function logoutSession() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(buildApiUrl("/auth/logout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    }).catch(() => {});
  }

  clearSession();
}

export async function fetchWithAuth(input: string, init?: RequestInit) {
  const token = getAccessToken();
  const headers = new Headers(init?.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const doRequest = () =>
    fetch(input, {
      ...init,
      headers
    });

  let response = await doRequest();
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    clearSession();
    return response;
  }

  headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
  response = await doRequest();
  return response;
}
