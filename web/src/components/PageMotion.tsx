"use client";

import { usePathname } from "next/navigation";

/** Re-triggers a soft page entrance when the App Router path changes. */
export function PageMotion({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname() ?? "/";
  return (
    <div key={pathname} className={`motion-page ${className}`.trim()}>
      {children}
    </div>
  );
}
