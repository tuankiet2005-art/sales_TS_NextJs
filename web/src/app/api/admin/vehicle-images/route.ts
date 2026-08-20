export const runtime = "nodejs";

import { json, error } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { saveVehicleImage } from "@/server/services/vehicle-image-service";
import { invalidateCatalogCache } from "@/server/services/catalog-service";

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const form = await request.formData();
  const vehicleId = Number(form.get("vehicleId"));
  const kind = String(form.get("kind") ?? "").trim();
  const colorName = String(form.get("colorName") ?? "").trim();
  const file = form.get("file");

  if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
    return error("vehicleId is required");
  }
  if (kind !== "hero" && kind !== "color") {
    return error("kind must be hero or color");
  }
  if (!(file instanceof File)) {
    return error("file is required");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return error("file is empty");
  }

  const saved = await saveVehicleImage({
    vehicleId,
    kind,
    colorName: kind === "color" ? colorName : undefined,
    buffer,
  });

  invalidateCatalogCache();

  return json(
    {
      id: saved.id,
      vehicleId: saved.vehicleId,
      kind: saved.kind,
      colorName: saved.colorName,
      url: `/api/vehicle-images/${saved.id}`,
    },
    201,
  );
}
