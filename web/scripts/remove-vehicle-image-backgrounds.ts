import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

import { getDb } from "../src/server/db/client";
import { vehicleImages } from "../src/server/db/schema";
import { processVehicleImageBuffer } from "../src/server/lib/processVehicleImage";
import { invalidateCatalogCache } from "../src/server/services/catalog-service";
import { decodeVehicleImageData } from "../src/server/services/vehicle-image-service";

function loadEnvFile(filePath: string) {
  return fs.readFile(filePath, "utf8").then((content) => {
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const index = trimmed.indexOf("=");
      if (index === -1) {
        continue;
      }
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }).catch(() => undefined);
}

export interface ReprocessSummary {
  imagesProcessed: number;
  dryRun: boolean;
}

export async function reprocessVehicleImageBackgrounds(options: { dryRun?: boolean } = {}): Promise<ReprocessSummary> {
  const dryRun = options.dryRun ?? false;
  const db = getDb();
  const rows = await db.select().from(vehicleImages).orderBy(vehicleImages.id);

  for (const row of rows) {
    const source = decodeVehicleImageData(row.data);
    const processed = await processVehicleImageBuffer(source);
    if (!dryRun) {
      await db
        .update(vehicleImages)
        .set({
          mimeType: "image/webp",
          data: processed.toString("base64"),
        })
        .where(eq(vehicleImages.id, row.id));
    }
    console.log(`Processed vehicle image ${row.id} (vehicle ${row.vehicleId}, kind ${row.kind})`);
  }

  if (!dryRun && rows.length > 0) {
    invalidateCatalogCache();
  }

  return {
    imagesProcessed: rows.length,
    dryRun,
  };
}

async function main() {
  const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  await loadEnvFile(path.join(webRoot, ".env.local"));

  const dryRun = process.argv.includes("--dry-run");
  const summary = await reprocessVehicleImageBackgrounds({ dryRun });
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
