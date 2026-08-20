import { unauthorized } from "../http";
import { isAuthorizedAdmin } from "./admin-auth";

export function requireAdmin(request: Request) {
  const header = request.headers.get("authorization");
  if (!isAuthorizedAdmin(header)) {
    return unauthorized("Invalid username or password");
  }
  return null;
}
