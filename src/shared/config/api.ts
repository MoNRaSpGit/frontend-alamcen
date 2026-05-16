import { readJsonStorage, writeJsonStorage } from "../lib/persistence";

const API_URL_STORAGE_KEY = "alamcen.api.baseUrl";

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

export function getDefaultApiBaseUrl() {
  return normalizeApiBaseUrl(
    import.meta.env.VITE_API_URL ?? buildLanApiFallback() ?? "http://localhost:3000/api/v1"
  );
}

export function getApiBaseUrl() {
  return normalizeApiBaseUrl(readJsonStorage(API_URL_STORAGE_KEY, getDefaultApiBaseUrl()));
}

export function setApiBaseUrl(value: string) {
  writeJsonStorage(API_URL_STORAGE_KEY, normalizeApiBaseUrl(value));
}

export function resetApiBaseUrl() {
  writeJsonStorage(API_URL_STORAGE_KEY, getDefaultApiBaseUrl());
}
