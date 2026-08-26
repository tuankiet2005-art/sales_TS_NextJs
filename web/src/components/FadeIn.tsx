"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motionVariants";

type FadeInProps = HTMLMotionProps<"div"> & {
  delay?: number;
};

/** Single-element fade-up entrance (React Bits–style reveal). */
export function FadeIn({ children, delay = 0, className, ...rest }: FadeInProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : "hidden"}
      animate="visible"
      variants={fadeUp}
      transition={{ duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = HTMLMotionProps<"div"> & {
  stagger?: number;
  delayChildren?: number;
};

/** Staggers direct motion children on mount. */
export function StaggerChildren({
  children,
  stagger = 0.07,
  delayChildren = 0,
  className,
  ...rest
}: StaggerProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : "hidden"}
      animate="visible"
      variants={staggerContainer(stagger, delayChildren)}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = HTMLMotionProps<"div">;

export function StaggerItem({ children, className, ...rest }: StaggerItemProps) {
  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className={className} {...rest}>
      {children}
    </motion.div>
  );
}
