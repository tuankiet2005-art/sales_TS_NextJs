export const runtime = "nodejs";

import { json, noContent } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { deleteLocation, upsertLocation } from "@/server/services/catalog-admin-service";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  return json(await upsertLocation({ ...(await request.json()), id: Number(id) }));
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  await deleteLocation(Number(id));
  return noContent();
}
