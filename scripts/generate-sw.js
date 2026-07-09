import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const swPath = resolve(root, "public", "sw.js");
const buildId = new Date().toISOString().replace(/[:.]/g, "-");

const current = readFileSync(swPath, "utf8");
const updated = current.replaceAll("__ALAMCEN_SW_BUILD_ID__", buildId);

if (updated === current) {
  throw new Error("No se encontro el placeholder del build id en public/sw.js");
}

writeFileSync(swPath, updated, "utf8");
