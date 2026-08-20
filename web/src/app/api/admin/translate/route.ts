export const runtime = "nodejs";

import { json } from "@/server/http";
import { requireAdmin } from "@/server/auth/require-admin";
import { translateFromVietnamese } from "@/server/services/text-translate-service";

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = await request.json();
  return json(await translateFromVietnamese(body?.text ?? ""));
}
