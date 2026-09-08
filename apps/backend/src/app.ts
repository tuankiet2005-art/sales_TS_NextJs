import cors from "cors";
import express from "express";

import { registerApiRoutes } from "./routes/register-routes.js";

export async function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "20mb" }));
  app.use(express.raw({ type: "multipart/form-data", limit: "30mb" }));

  app.get("/", (_req, res) => {
    res.json({ service: "onroad-api", status: "ok" });
  });

  console.log("Registering API routes:");
  await registerApiRoutes(app);

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  return app;
}
