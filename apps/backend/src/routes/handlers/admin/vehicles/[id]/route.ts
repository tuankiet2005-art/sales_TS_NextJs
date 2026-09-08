export const runtime = "nodejs";

import {json, noContent, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { deleteVehicle, upsertVehicle } from "@/server/modules/catalog/catalog-admin.service";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  return json(await upsertVehicle({ ...(await readJsonBody(request)), id: Number(id) }));
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  await deleteVehicle(Number(id));
  return noContent();
}
