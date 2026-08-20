import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  if (raw.startsWith("jdbc:postgresql://")) {
    return raw.replace("jdbc:postgresql://", "postgresql://");
  }
  return raw;
}

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!cachedDb) {
    const sql = neon(resolveDatabaseUrl());
    cachedDb = drizzle(sql, { schema });
  }
  return cachedDb;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
