export const runtime = "nodejs";

import { noContent } from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { deleteVehicleImage } from "@/server/modules/media/vehicle-image.service";
import { invalidateCatalogCache } from "@/server/modules/catalog/catalog.service";

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
