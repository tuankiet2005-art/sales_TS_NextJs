export const runtime = "nodejs";

import { noContent } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { deleteAccessoryImage } from "@/server/services/accessory-image-service";

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

  await deleteAccessoryImage(id);
  return noContent();
}
