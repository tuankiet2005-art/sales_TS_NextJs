import type { CSSProperties } from "react";

/** Stagger delay for list/card entrance animations. */
export function motionStagger(index: number, stepMs = 55, capMs = 440): CSSProperties {
  return { animationDelay: `${Math.min(index * stepMs, capMs)}ms` };
}

export const motionInteractive =
  "motion-interactive transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-motion";

export const motionCard =
  "motion-card motion-interactive transition-[transform,box-shadow,border-color] duration-300 ease-motion hover:-translate-y-1 hover:border-copper/40";

export const motionPress = "active:scale-[0.98]";
