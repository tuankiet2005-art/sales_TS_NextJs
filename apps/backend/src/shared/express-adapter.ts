import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction, RequestHandler } from "express";

import type { NextRequest } from "../server/shared/http.js";

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

export type RouteExports = {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  PATCH?: RouteHandler;
  DELETE?: RouteHandler;
};

function toNextRequest(req: ExpressRequest): NextRequest {
  const protocol = req.protocol;
  const host = req.get("host") ?? "localhost";
  const url = `${protocol}://${host}${req.originalUrl}`;
  const nextUrl = new URL(url);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD" && req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) {
      init.body = req.body as BodyInit;
    } else if (typeof req.body === "string") {
      init.body = req.body;
    } else if (req.body != null) {
      init.body = JSON.stringify(req.body);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    }
  }
  const webReq = new Request(url, init);
  return Object.assign(webReq, { nextUrl });
}

async function sendWebResponse(webRes: Response, res: ExpressResponse) {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.send(buf);
}

export function adaptHandlers(handlers: RouteExports): RequestHandler {
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const method = req.method as keyof RouteExports;
    const handler = handlers[method];
    if (!handler) {
      res.status(405).json({ message: "Method not allowed" });
      return;
    }
    try {
      const webReq = toNextRequest(req);
      const context = { params: Promise.resolve(req.params as Record<string, string>) };
      const webRes = await handler(webReq, context);
      await sendWebResponse(webRes, res);
    } catch (err) {
      next(err);
    }
  };
}

/** handlers/foo/[id]/route.ts → /api/foo/:id */
export function handlerPathToApiRoute(relativePath: string): string {
  const withoutRoute = relativePath.replace(/\/route\.ts$/, "");
  const segments = withoutRoute.split("/").map((seg) => {
    if (seg.startsWith("[") && seg.endsWith("]")) {
      return `:${seg.slice(1, -1)}`;
    }
    return seg;
  });
  return `/api/${segments.join("/")}`;
}
