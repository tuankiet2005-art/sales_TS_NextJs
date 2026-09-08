export const runtime = "nodejs";

import {json, readJsonBody} from "@/server/shared/http";
import { requireAdmin } from "@/server/modules/auth/require-admin";
import { translateFromVietnamese } from "@/server/modules/translate/text-translate.service";

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  return json(await translateFromVietnamese(body?.text ?? ""));
}
