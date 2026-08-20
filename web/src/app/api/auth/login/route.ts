export const runtime = "nodejs";

import { error, json, unauthorized } from "@/server/http";
import { loginAdmin } from "@/server/auth/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = body?.username ?? "";
  const password = body?.password ?? "";
  const token = loginAdmin(username, password);
  if (!token) {
    return unauthorized("Invalid username or password");
  }
  return json({ token, username });
}
