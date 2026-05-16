import { readJsonStorage, writeJsonStorage } from "../lib/persistence";

const API_URL_STORAGE_KEY = "alamcen.api.baseUrl";
const OFFICIAL_API_BASE_URL = "https://saasproback.onrender.com/api/v1";

function normalizeApiBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function isPrivateNetworkHostname(hostname: string) {
  if (["localhost", "127.0.0.1"].includes(hostname) || hostname.endsWith(".local")) {
    return true;
  }

  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4Match) {
    return false;
  }

  const [, firstOctet, secondOctet] = ipv4Match.map(Number);
  if (firstOctet === 10) {
    return true;
  }

  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true;
  }

  return firstOctet === 192 && secondOctet === 168;
}

function buildLanApiFallback() {
  if (typeof window === "undefined") {
    return null;
  }

  const { protocol, hostname } = window.location;
  if (protocol !== "http:" || !isPrivateNetworkHostname(hostname)) {
    return null;
  }

  return `http://${hostname}:3000/api/v1`;
}

function getLegacyLocalDefaults() {
  const defaults = ["http://localhost:3000/api/v1", "http://127.0.0.1:3000/api/v1"];
  const lanFallback = buildLanApiFallback();

  return Array.from(new Set(lanFallback ? [...defaults, lanFallback] : defaults));
}

export function getDefaultApiBaseUrl() {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_URL ?? buildLanApiFallback() ?? OFFICIAL_API_BASE_URL);
}

function resolveStoredApiBaseUrl() {
  const storedValue = normalizeApiBaseUrl(readJsonStorage(API_URL_STORAGE_KEY, ""));
  if (!storedValue) {
    return getDefaultApiBaseUrl();
  }

  const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
  if (isHttpsPage && getLegacyLocalDefaults().includes(storedValue)) {
    const nextValue = getDefaultApiBaseUrl();
    writeJsonStorage(API_URL_STORAGE_KEY, nextValue);
    return nextValue;
  }

  return storedValue;
}

export function getApiBaseUrl() {
  return resolveStoredApiBaseUrl();
}

export function setApiBaseUrl(value: string) {
  writeJsonStorage(API_URL_STORAGE_KEY, normalizeApiBaseUrl(value));
}

export function resetApiBaseUrl() {
  writeJsonStorage(API_URL_STORAGE_KEY, getDefaultApiBaseUrl());
}

export function isLocalHttpApiUrl(value: string) {
  const normalizedValue = normalizeApiBaseUrl(value);

  try {
    const parsed = new URL(normalizedValue);
    return parsed.protocol === "http:" && isPrivateNetworkHostname(parsed.hostname);
  } catch {
    return false;
  }
}
