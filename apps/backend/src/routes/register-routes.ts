import type { Express } from "express";

import { adaptHandlers, type RouteExports } from "../shared/express-adapter.js";
import { ROUTE_MANIFEST } from "./route-manifest.js";

function routeSpecificity(path: string) {
  const dynamic = path.split("/").filter((seg) => seg.startsWith(":")).length;
  return { dynamic, length: path.length };
}

export async function registerApiRoutes(app: Express) {
  const routes = [...ROUTE_MANIFEST].sort((a, b) => {
    const sa = routeSpecificity(a.path);
    const sb = routeSpecificity(b.path);
    if (sa.dynamic !== sb.dynamic) return sa.dynamic - sb.dynamic;
    return sb.length - sa.length;
  });

  for (const { path, handlers } of routes) {
    app.all(path, adaptHandlers(handlers as RouteExports));
    console.log(`  ${path}`);
  }
}
