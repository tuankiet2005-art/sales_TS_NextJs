import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function copyDir(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

copyDir(
  join(backendRoot, "src/server/config/data"),
  join(backendRoot, "dist/server/config/data"),
);
copyDir(
  join(backendRoot, "src/server/assets/quote-report"),
  join(backendRoot, "dist/server/assets/quote-report"),
);

console.log("Copied server config data and quote-report assets to dist/");
