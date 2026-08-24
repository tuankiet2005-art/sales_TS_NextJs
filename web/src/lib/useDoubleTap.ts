import { useRef } from "react";
import type { TouchEvent } from "react";

const DEFAULT_DELAY_MS = 300;

export class DoubleTapTracker {
  private lastTap = 0;

  constructor(private delayMs = DEFAULT_DELAY_MS) {}

  registerTap(now: number): boolean {
    if (now - this.lastTap <= this.delayMs) {
      this.lastTap = 0;
      return true;
    }
    this.lastTap = now;
    return false;
  }
}

export function useDoubleTap(onDoubleTap: () => void, delayMs = DEFAULT_DELAY_MS) {
  const trackerRef = useRef<DoubleTapTracker | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = new DoubleTapTracker(delayMs);
  }

  function onTouchEnd(event: TouchEvent) {
    if (event.changedTouches.length !== 1) {
      return;
    }
    if (trackerRef.current?.registerTap(Date.now())) {
      onDoubleTap();
    }
  }

  return { onTouchEnd };
}
