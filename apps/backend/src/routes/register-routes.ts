import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { Express } from "express";

import { adaptHandlers, handlerPathToApiRoute } from "../shared/express-adapter.js";

const HANDLERS_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "handlers");

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findRouteFiles(full));
    } else if (entry === "route.ts" || entry === "route.js") {
      results.push(full);
    }
  }
  return results;
}

export async function registerApiRoutes(app: Express) {
  if (!statSync(HANDLERS_ROOT, { throwIfNoEntry: false })?.isDirectory()) {
    console.warn("No route handlers directory found");
    return;
  }

  const routeFiles = findRouteFiles(HANDLERS_ROOT);
  for (const file of routeFiles) {
    const rel = relative(HANDLERS_ROOT, file).replace(/\\/g, "/");
    const apiPath = handlerPathToApiRoute(rel);
    const mod = await import(pathToFileURL(file).href);
    app.all(apiPath, adaptHandlers(mod));
    console.log(`  ${apiPath}`);
  }
}
