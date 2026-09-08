import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(backendRoot, ".env.local") });
config({ path: join(backendRoot, ".env") });
