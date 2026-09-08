export const runtime = "nodejs";

import {error, json, unauthorized, readJsonBody} from "@/server/shared/http";
import { login } from "@/server/modules/auth/admin-auth";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const username = body?.username ?? "";
  const password = body?.password ?? "";
  const session = login(username, password);
  if (!session) {
    return unauthorized("Invalid username or password");
  }
  return json({ token: session.token, username: session.username, role: session.role });
}
