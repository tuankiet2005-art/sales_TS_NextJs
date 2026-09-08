import "./load-env.js";

import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 4000);

const app = await createApp();

const server = app.listen(PORT, () => {
  console.log(`OnRoad API listening on http://localhost:${PORT}`);
});

server.on("error", async (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    const { formatPortInUseMessage } = await import("@repo/port-in-use-hint");
    console.error(formatPortInUseMessage(PORT, "API"));
    process.exit(1);
  }
  throw err;
});
