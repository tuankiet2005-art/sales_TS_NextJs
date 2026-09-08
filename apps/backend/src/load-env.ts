import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(backendRoot, ".env.local") });
config({ path: join(backendRoot, ".env") });
