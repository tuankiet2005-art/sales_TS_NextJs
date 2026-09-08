import { describe, expect, it } from "vitest";

import { sessionGateView } from "./sessionGate";

describe("sessionGateView", () => {
  it("stays pending until storage is read so a signed-in reload does not flash login", () => {
    expect(sessionGateView(false, true)).toBe("pending");
    expect(sessionGateView(false, false)).toBe("pending");
  });

  it("shows the app when ready and signed in", () => {
    expect(sessionGateView(true, true)).toBe("app");
  });

  it("shows login when ready and signed out", () => {
    expect(sessionGateView(true, false)).toBe("login");
  });
});
