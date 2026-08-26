"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { pageTransition } from "@/lib/motionVariants";

/** Re-triggers a soft page entrance when the App Router path changes. */
export function PageMotion({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname() ?? "/";
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={reduced ? false : pageTransition.initial}
        animate={pageTransition.animate}
        exit={reduced ? undefined : pageTransition.exit}
        transition={pageTransition.transition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
