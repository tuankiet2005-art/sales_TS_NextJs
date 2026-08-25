/**
 * Adds permanent/temporary address columns to customers when missing.
 * Usage (from web/): npm run migrate:customer-addresses
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envLocal = readFileSync(join(root, "web/.env.local"), "utf8");
const databaseUrlMatch = envLocal.match(/^DATABASE_URL=(.+)$/m);
if (!databaseUrlMatch) {
  throw new Error("DATABASE_URL not found in web/.env.local");
}
const databaseUrl = databaseUrlMatch[1].trim().replace(/^["']|["']$/g, "");

const sql = neon(databaseUrl);

await sql`
  ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS permanent_street_line VARCHAR(240),
    ADD COLUMN IF NOT EXISTS permanent_location_id BIGINT REFERENCES locations (id),
    ADD COLUMN IF NOT EXISTS permanent_district_id BIGINT REFERENCES location_districts (id),
    ADD COLUMN IF NOT EXISTS temporary_street_line VARCHAR(240),
    ADD COLUMN IF NOT EXISTS temporary_location_id BIGINT REFERENCES locations (id),
    ADD COLUMN IF NOT EXISTS temporary_district_id BIGINT REFERENCES location_districts (id)
`;

await sql`
  UPDATE customers
  SET
    permanent_street_line = COALESCE(permanent_street_line, street_line),
    permanent_location_id = COALESCE(permanent_location_id, location_id),
    permanent_district_id = COALESCE(permanent_district_id, district_id)
  WHERE street_line IS NOT NULL
     OR location_id IS NOT NULL
     OR district_id IS NOT NULL
`;

const columns = await sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'customers'
    AND column_name IN (
      'permanent_street_line',
      'permanent_location_id',
      'permanent_district_id',
      'temporary_street_line',
      'temporary_location_id',
      'temporary_district_id'
    )
`;

console.log(`Customer address migration applied. Columns present: ${columns.length}/6`);
