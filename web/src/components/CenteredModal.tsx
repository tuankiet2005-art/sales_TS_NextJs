"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] overflow-y-auto ${backdropClassName}`}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`my-auto w-full max-h-[92dvh] ${scrollPanel ? "overflow-y-auto" : "overflow-hidden"} ${panelClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
