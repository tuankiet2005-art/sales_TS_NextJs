"use client";

import { Loader2 } from "lucide-react";
import { Header } from "./Header";

export function LoadingSpinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-copper ${className}`} aria-hidden />;
}

export function LoadingBlock({
  message,
  className = "",
  size = "md",
}: {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const spinnerSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-ink/55 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingSpinner className={spinnerSize} />
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}

export function PageLoading({ message }: { message?: string }) {
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <LoadingBlock message={message} className="py-8" size="lg" />
    </div>
  );
}

export function PageLoadingScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen">
      <Header />
      <PageLoading message={message} />
    </div>
  );
}

export function BrandCardSkeleton({ count = 2 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-card motion-fade-in"
          aria-hidden
        >
          <div className="aspect-[16/8] animate-pulse bg-mist" />
          <div className="flex justify-end p-4 sm:p-5">
            <div className="h-9 w-28 animate-pulse rounded-full bg-mist" />
          </div>
        </div>
      ))}
    </>
  );
}

export function VehicleCardSkeleton({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`overflow-hidden border border-ink/8 bg-white shadow-card motion-fade-in ${
            compact ? "flex h-full min-h-0 flex-col rounded-2xl" : "rounded-3xl"
          }`}
          aria-hidden
        >
          <div
            className={`animate-pulse bg-mist ${
              compact ? "min-h-[5.5rem] flex-1" : "aspect-[16/10]"
            }`}
          />
          <div className={compact ? "space-y-2 p-2.5 sm:p-3" : "space-y-3 p-4"}>
            <div className="h-4 w-2/3 animate-pulse rounded bg-mist" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-mist" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-mist" />
          </div>
        </div>
      ))}
    </>
  );
}

export function TableRowsSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <tbody aria-hidden>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="border-t border-ink/6">
          {Array.from({ length: columns }, (__, columnIndex) => (
            <td key={columnIndex} className="px-3 py-3">
              <div
                className="h-4 animate-pulse rounded bg-mist"
                style={{ width: `${55 + ((rowIndex + columnIndex) % 3) * 12}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function PanelLoading({ message }: { message?: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-ink/8 bg-white px-4 py-12 shadow-card">
      <LoadingBlock message={message} />
    </div>
  );
}
