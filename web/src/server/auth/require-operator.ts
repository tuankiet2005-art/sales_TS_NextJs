import { unauthorized } from "../http";
import { resolveSession } from "./admin-auth";

export function requireOperator(request: Request) {
  const session = resolveSession(request.headers.get("authorization"));
  if (!session) {
    return unauthorized("Sign in required");
  }
  return null;
}
