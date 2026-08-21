import { forbidden, unauthorized } from "../http";
import { resolveSession } from "./admin-auth";

export function requireAdmin(request: Request) {
  const session = resolveSession(request.headers.get("authorization"));
  if (!session) {
    return unauthorized("Invalid username or password");
  }
  if (session.role !== "admin") {
    return forbidden("Admin access required");
  }
  return null;
}
