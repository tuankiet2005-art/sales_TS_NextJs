import { eq } from "drizzle-orm";

import type { AdminAccessory, AccessoryCatalogItem } from "@/types";
import { getDb } from "../db/client";
import { accessories } from "../db/schema";

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapAccessory(row: typeof accessories.$inferSelect): AdminAccessory {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameEn: row.nameEn ?? undefined,
    nameZh: row.nameZh ?? undefined,
    nameJa: row.nameJa ?? undefined,
    amount: Number(row.amount),
    imageUrl: row.imageUrl ?? undefined,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

function mapCatalogItem(row: typeof accessories.$inferSelect): AccessoryCatalogItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameEn: row.nameEn ?? undefined,
    nameZh: row.nameZh ?? undefined,
    nameJa: row.nameJa ?? undefined,
    amount: Number(row.amount),
    imageUrl: row.imageUrl ?? undefined,
  };
}

export async function listActiveAccessories(): Promise<AccessoryCatalogItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(accessories)
    .where(eq(accessories.active, true))
    .orderBy(accessories.sortOrder, accessories.name);
  return rows.map(mapCatalogItem);
}

export async function listAdminAccessories() {
  const db = getDb();
  const rows = await db.select().from(accessories).orderBy(accessories.sortOrder, accessories.name);
  return rows.map(mapAccessory);
}

export async function upsertAccessory(record: AdminAccessory) {
  const db = getDb();
  const code = record.code?.trim() || slug(record.name);
  const values = {
    code,
    name: record.name.trim(),
    nameEn: record.nameEn?.trim() || null,
    nameZh: record.nameZh?.trim() || null,
    nameJa: record.nameJa?.trim() || null,
    amount: String(record.amount),
    imageUrl: record.imageUrl?.trim() || null,
    active: record.active ?? true,
    sortOrder: record.sortOrder ?? 0,
  };

  if (record.id) {
    const rows = await db.update(accessories).set(values).where(eq(accessories.id, record.id)).returning();
    return mapAccessory(rows[0]);
  }

  const rows = await db.insert(accessories).values(values).returning();
  return mapAccessory(rows[0]);
}

export async function deleteAccessory(id: number) {
  const db = getDb();
  await db.delete(accessories).where(eq(accessories.id, id));
}

export async function setAccessoryImageUrl(accessoryId: number, imageId: number) {
  const db = getDb();
  await db
    .update(accessories)
    .set({ imageUrl: String(imageId) })
    .where(eq(accessories.id, accessoryId));
}
