export const runtime = "nodejs";

import { json, error } from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { saveAccessoryImage } from "@/server/modules/accessory/accessory-image.service";
import { setAccessoryImageUrl } from "@/server/modules/accessory/accessory.service";

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const form = await request.formData();
  const accessoryId = Number(form.get("accessoryId"));
  const file = form.get("file");

  if (!Number.isFinite(accessoryId) || accessoryId <= 0) {
    return error("accessoryId is required");
  }
  if (!(file instanceof File)) {
    return error("file is required");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return error("file is empty");
  }

  const saved = await saveAccessoryImage({ accessoryId, buffer });
  await setAccessoryImageUrl(accessoryId, saved.id);

  return json(
    {
      id: saved.id,
      accessoryId: saved.accessoryId,
      url: `/api/accessory-images/${saved.id}`,
    },
    201,
  );
}
