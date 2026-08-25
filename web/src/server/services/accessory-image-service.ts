import { eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { accessoryImages } from "../db/schema";
import { convertBufferToWebp } from "./vehicle-image-service";

export interface SaveAccessoryImageInput {
  accessoryId: number;
  buffer: Buffer;
}

export async function saveAccessoryImage(input: SaveAccessoryImageInput) {
  const webp = await convertBufferToWebp(input.buffer);
  const db = getDb();

  const existing = await db
    .select({ id: accessoryImages.id })
    .from(accessoryImages)
    .where(eq(accessoryImages.accessoryId, input.accessoryId))
    .limit(1);

  const values = {
    accessoryId: input.accessoryId,
    mimeType: "image/webp",
    data: webp.toString("base64"),
  };

  if (existing[0]) {
    const rows = await db
      .update(accessoryImages)
      .set(values)
      .where(eq(accessoryImages.id, existing[0].id))
      .returning();
    return rows[0];
  }

  const rows = await db.insert(accessoryImages).values(values).returning();
  return rows[0];
}

export async function findAccessoryImageById(id: number) {
  const db = getDb();
  const rows = await db.select().from(accessoryImages).where(eq(accessoryImages.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteAccessoryImage(id: number) {
  const db = getDb();
  await db.delete(accessoryImages).where(eq(accessoryImages.id, id));
}

export function decodeAccessoryImageData(encoded: string): Buffer {
  return Buffer.from(encoded, "base64");
}
