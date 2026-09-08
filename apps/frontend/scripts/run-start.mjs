import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exitIfPortInUse } from "../../../scripts/port-in-use-hint.mjs";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..", "..");
const port = Number(process.env.PORT ?? 3000);

function resolveNextBin() {
  for (const base of [frontendRoot, repoRoot]) {
    const candidate = join(base, "node_modules", "next", "dist", "bin", "next");
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const nextBin = resolveNextBin();
if (!nextBin) {
  console.error("next is not installed. Run: npm install");
  process.exit(1);
}

const prodReady = existsSync(join(frontendRoot, ".next", "prerender-manifest.json"));

if (!prodReady) {
  console.warn(
    "No production build (.next/prerender-manifest.json). Starting next dev.\nFor production: npm run build -w @onroad/frontend && npm start",
  );
}

await exitIfPortInUse(port, "web app");

const child = spawn(process.execPath, [nextBin, prodReady ? "start" : "dev"], {
  stdio: "inherit",
  cwd: frontendRoot,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
