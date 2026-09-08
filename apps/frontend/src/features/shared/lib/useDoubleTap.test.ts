import { describe, expect, it } from "vitest";

import { DoubleTapTracker } from "./useDoubleTap";

describe("DoubleTapTracker", () => {
  it("fires on two taps within the delay window", () => {
    const tracker = new DoubleTapTracker(300);
    expect(tracker.registerTap(1000)).toBe(false);
    expect(tracker.registerTap(1200)).toBe(true);
  });

  it("does not fire when taps are separated by more than the delay", () => {
    const tracker = new DoubleTapTracker(50);
    expect(tracker.registerTap(1000)).toBe(false);
    expect(tracker.registerTap(1100)).toBe(false);
  });

  it("does not fire on a single tap", () => {
    const tracker = new DoubleTapTracker(300);
    expect(tracker.registerTap(1000)).toBe(false);
  });
});
