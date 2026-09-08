import type { Express } from "express";

import { adaptHandlers, type RouteExports } from "../shared/express-adapter.js";
import { ROUTE_MANIFEST } from "./route-manifest.js";

export async function registerApiRoutes(app: Express) {
  for (const { path, handlers } of ROUTE_MANIFEST) {
    app.all(path, adaptHandlers(handlers as RouteExports));
    console.log(`  ${path}`);
  }
}
