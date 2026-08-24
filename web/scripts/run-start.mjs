import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = join(webRoot, "node_modules", "next", "dist", "bin", "next");
const prodReady = existsSync(join(webRoot, ".next", "prerender-manifest.json"));

if (!prodReady) {
  console.warn(
    "No production build (.next/prerender-manifest.json). Starting next dev.\nFor production: npm run build && npm start",
  );
}

const child = spawn(process.execPath, [nextBin, prodReady ? "start" : "dev"], {
  stdio: "inherit",
  cwd: webRoot,
  env: process.env,
});
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
