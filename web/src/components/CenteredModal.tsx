"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { modalBackdrop, modalPanel } from "@/lib/motionVariants";

export function CenteredModal({
  open = true,
  onClose,
  children,
  panelClassName = "",
  backdropClassName = "bg-ink/45",
  scrollPanel = true,
}: {
  open?: boolean;
  onClose?: () => void;
  children: ReactNode;
  panelClassName?: string;
  backdropClassName?: string;
  scrollPanel?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="centered-modal"
          className={`fixed inset-0 z-[60] overflow-y-auto ${backdropClassName}`}
          onClick={onClose}
          initial={modalBackdrop.initial}
          animate={modalBackdrop.animate}
          exit={modalBackdrop.exit}
          transition={modalBackdrop.transition}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              className={`my-auto w-full max-h-[92dvh] ${scrollPanel ? "overflow-y-auto" : "overflow-hidden"} ${panelClassName}`}
              onClick={(event) => event.stopPropagation()}
              initial={modalPanel.initial}
              animate={modalPanel.animate}
              exit={modalPanel.exit}
              transition={modalPanel.transition}
            >
              {children}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
