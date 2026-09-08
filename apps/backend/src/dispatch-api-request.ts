import { match } from "path-to-regexp";

import type { NextRequest } from "./server/shared/http.js";
import type { RouteExports } from "./shared/express-adapter.js";
import { ROUTE_MANIFEST } from "./routes/route-manifest.js";

type RouteMatcher = {
  loadHandlers: () => Promise<unknown>;
  matchPath: (pathname: string) => false | { params: Record<string, string> };
};

function routeSpecificity(path: string) {
  const dynamic = path.split("/").filter((seg) => seg.startsWith(":")).length;
  return { dynamic, length: path.length };
}

const ROUTE_MATCHERS: RouteMatcher[] = [...ROUTE_MANIFEST]
  .sort((a, b) => {
    const sa = routeSpecificity(a.path);
    const sb = routeSpecificity(b.path);
    if (sa.dynamic !== sb.dynamic) return sa.dynamic - sb.dynamic;
    return sb.length - sa.length;
  })
  .map(({ loadHandlers, path }) => ({
    loadHandlers,
    matchPath: match(path, { decode: decodeURIComponent }),
  }));

export async function dispatchApiRequest(request: NextRequest): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  const method = request.method as keyof RouteExports;

  for (const { loadHandlers, matchPath } of ROUTE_MATCHERS) {
    const matched = matchPath(pathname);
    if (!matched) continue;

    const handlers = (await loadHandlers()) as RouteExports;
    const handler = handlers[method];
    if (!handler) {
      return Response.json({ message: "Method not allowed" }, { status: 405 });
    }

    const params = Object.fromEntries(
      Object.entries(matched.params).map(([key, value]) => [key, String(value)]),
    );
    return handler(request, { params: Promise.resolve(params) });
  }

  return Response.json({ message: "Not found" }, { status: 404 });
}
