import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { exitIfPortInUse } from "../../../scripts/port-in-use-hint.mjs";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(backendRoot, "..", "..");
const port = Number(process.env.PORT ?? 4000);

config({ path: join(backendRoot, ".env.local") });
config({ path: join(backendRoot, ".env") });

function resolveModuleBin(packageName, relativeBin) {
  for (const base of [backendRoot, repoRoot]) {
    const candidate = join(base, "node_modules", packageName, relativeBin);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const distEntry = join(backendRoot, "dist", "server.js");
const useDist =
  existsSync(distEntry) && process.env.NODE_ENV === "production";

let command;
let args;

if (useDist) {
  command = process.execPath;
  args = [distEntry];
} else {
  const tsxCli = resolveModuleBin("tsx", "dist/cli.mjs");
  if (!tsxCli) {
    console.error("tsx is not installed. Run: npm install");
    process.exit(1);
  }
  if (existsSync(distEntry)) {
    console.warn(
      "Using tsx for local API start (dist/ is only used when NODE_ENV=production).\nFor a production build: npm run build -w @onroad/backend && NODE_ENV=production npm start",
    );
  } else {
    console.warn(
      "No production build (dist/server.js). Starting API with tsx.\nFor production: npm run build -w @onroad/backend && NODE_ENV=production npm start",
    );
  }
  command = process.execPath;
  args = [tsxCli, join(backendRoot, "src", "server.ts")];
}

await exitIfPortInUse(port, "API");

const child = spawn(command, args, {
  stdio: "inherit",
  cwd: backendRoot,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
