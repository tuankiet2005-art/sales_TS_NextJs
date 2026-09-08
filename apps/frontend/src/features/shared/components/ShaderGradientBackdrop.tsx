"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Lightweight mesh-gradient backdrop inspired by shadergradient.co —
 * CSS blobs + Motion drift, no WebGL dependency.
 */
export function ShaderGradientBackdrop() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="shader-gradient-base absolute inset-0" />
      <motion.div
        className="shader-blob shader-blob-copper absolute -left-[12%] top-[-8%] h-[52vmin] w-[52vmin]"
        animate={
          reduced
            ? undefined
            : {
                x: [0, 48, -24, 0],
                y: [0, -32, 20, 0],
                scale: [1, 1.08, 0.96, 1],
              }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="shader-blob shader-blob-forest absolute -right-[10%] top-[18%] h-[44vmin] w-[44vmin]"
        animate={
          reduced
            ? undefined
            : {
                x: [0, -36, 28, 0],
                y: [0, 24, -18, 0],
                scale: [1, 0.94, 1.06, 1],
              }
        }
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="shader-blob shader-blob-mist absolute bottom-[-12%] left-[28%] h-[58vmin] w-[58vmin]"
        animate={
          reduced
            ? undefined
            : {
                x: [0, 32, -40, 0],
                y: [0, -20, 16, 0],
                scale: [1, 1.04, 0.98, 1],
              }
        }
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
      <div className="shader-gradient-vignette absolute inset-0" />
    </div>
  );
}
