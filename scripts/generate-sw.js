import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const swPath = resolve(root, "public", "sw.js");
const buildId = new Date().toISOString().replace(/[:.]/g, "-");

const current = readFileSync(swPath, "utf8");
const updated = current.includes("__ALAMCEN_SW_BUILD_ID__")
  ? current.replaceAll("__ALAMCEN_SW_BUILD_ID__", buildId)
  : current.replace(/const CACHE_NAME = "alamcen-pwa-[^"]+";/, `const CACHE_NAME = "alamcen-pwa-${buildId}";`);

if (updated === current) {
  throw new Error('No se encontro una linea CACHE_NAME compatible en public/sw.js');
}

writeFileSync(swPath, updated, "utf8");
