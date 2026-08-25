import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

import { getDb } from "../db/client";
import { vehicleImages } from "../db/schema";

export type VehicleImageKind = "hero" | "color";

export interface SaveVehicleImageInput {
  vehicleId: number;
  kind: VehicleImageKind;
  colorName?: string;
  buffer: Buffer;
  mimeType?: string;
}

export async function convertBufferToWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).webp({ quality: 85 }).toBuffer();
}

export async function convertFileToWebp(file: Buffer): Promise<Buffer> {
  return convertBufferToWebp(file);
}

function colorImageSlot(colorName: string): string {
  return `${colorName}::${randomUUID()}`;
}

export async function saveVehicleImage(input: SaveVehicleImageInput) {
  const webp = await convertBufferToWebp(input.buffer);
  const db = getDb();
  const baseColor = input.kind === "color" ? input.colorName?.trim() : undefined;
  if (input.kind === "color" && !baseColor) {
    throw new Error("Color name is required for color images");
  }

  if (input.kind === "color") {
    const rows = await db
      .insert(vehicleImages)
      .values({
        vehicleId: input.vehicleId,
        kind: input.kind,
        colorName: colorImageSlot(baseColor!),
        mimeType: "image/webp",
        data: webp.toString("base64"),
      })
      .returning();
    return rows[0];
  }

  const existing = await db
    .select({ id: vehicleImages.id })
    .from(vehicleImages)
    .where(
      and(
        eq(vehicleImages.vehicleId, input.vehicleId),
        eq(vehicleImages.kind, input.kind),
        isNull(vehicleImages.colorName),
      ),
    )
    .limit(1);

  const values = {
    vehicleId: input.vehicleId,
    kind: input.kind,
    colorName: null,
    mimeType: "image/webp",
    data: webp.toString("base64"),
  };

  if (existing[0]) {
    const rows = await db
      .update(vehicleImages)
      .set(values)
      .where(eq(vehicleImages.id, existing[0].id))
      .returning();
    return rows[0];
  }

  const rows = await db.insert(vehicleImages).values(values).returning();
  return rows[0];
}

export async function findVehicleImageById(id: number) {
  const db = getDb();
  const rows = await db.select().from(vehicleImages).where(eq(vehicleImages.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteVehicleImage(id: number) {
  const db = getDb();
  await db.delete(vehicleImages).where(eq(vehicleImages.id, id));
}

export async function deleteVehicleImagesForVehicle(vehicleId: number) {
  const db = getDb();
  await db.delete(vehicleImages).where(eq(vehicleImages.vehicleId, vehicleId));
}

export function decodeVehicleImageData(encoded: string): Buffer {
  return Buffer.from(encoded, "base64");
}

export async function findHeroImageId(vehicleId: number): Promise<number | null> {
  const db = getDb();
  const rows = await db
    .select({ id: vehicleImages.id })
    .from(vehicleImages)
    .where(and(eq(vehicleImages.vehicleId, vehicleId), eq(vehicleImages.kind, "hero")))
    .limit(1);
  return rows[0]?.id ?? null;
}
