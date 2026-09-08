export type SessionGateView = "pending" | "login" | "app";

export function sessionGateView(ready: boolean, signedIn: boolean): SessionGateView {
  if (!ready) {
    return "pending";
  }
  return signedIn ? "app" : "login";
}
