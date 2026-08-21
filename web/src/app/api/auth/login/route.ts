export const runtime = "nodejs";

import { error, json, unauthorized } from "@/server/http";
import { login } from "@/server/auth/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = body?.username ?? "";
  const password = body?.password ?? "";
  const session = login(username, password);
  if (!session) {
    return unauthorized("Invalid username or password");
  }
  return json({ token: session.token, username: session.username, role: session.role });
}
