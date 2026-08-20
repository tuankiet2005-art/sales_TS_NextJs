export const runtime = "nodejs";

import { noContent } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { deleteVehicleImage } from "@/server/services/vehicle-image-service";
import { invalidateCatalogCache } from "@/server/services/catalog-service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return noContent();
  }

  await deleteVehicleImage(id);
  invalidateCatalogCache();
  return noContent();
}
