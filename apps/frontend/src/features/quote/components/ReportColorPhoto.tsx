"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  getCachedReportColorPhotoCutout,
  loadReportColorPhotoCutout,
} from "@/features/quote/lib/reportColorPhotoCutout";
import { toReportColorPhotoSrc } from "@/features/quote/lib/reportColorPhoto";
import { LoadingSpinner } from "@/features/shared/components/LoadingState";

export function ReportColorPhoto({
  src,
  alt,
  className = "",
  style,
  quiet = false,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  /** Quote sheet: show the catalog photo immediately, then swap to the cutout when ready. */
  quiet?: boolean;
}) {
  const reportSrc = toReportColorPhotoSrc(src);
  const usesReportApi = Boolean(src) && reportSrc !== src;
  const initialCutout = usesReportApi ? getCachedReportColorPhotoCutout(reportSrc) : undefined;
  const [displaySrc, setDisplaySrc] = useState(initialCutout ?? src);
  const [cutoutPending, setCutoutPending] = useState(usesReportApi && !initialCutout);

  useEffect(() => {
    if (!src) {
      setDisplaySrc("");
      setCutoutPending(false);
      return;
    }

    if (!usesReportApi) {
      setDisplaySrc(src);
      setCutoutPending(false);
      return;
    }

    let cancelled = false;
    const cached = getCachedReportColorPhotoCutout(reportSrc);
    if (cached) {
      setDisplaySrc(cached);
      setCutoutPending(false);
      return;
    }

    setDisplaySrc(src);
    setCutoutPending(true);

    loadReportColorPhotoCutout(reportSrc, src)
      .then((url) => {
        if (!cancelled) {
          setDisplaySrc(url);
          setCutoutPending(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplaySrc(src);
          setCutoutPending(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reportSrc, src, usesReportApi]);

  if (!displaySrc) {
    if (quiet) {
      return null;
    }
    return (
      <div className="relative flex h-full w-full items-center justify-center" aria-busy={cutoutPending}>
        <LoadingSpinner className="h-4 w-4" />
      </div>
    );
  }

  const image = (
    <img
      src={displaySrc}
      alt={alt}
      className={quiet ? className : `${className} ${cutoutPending ? "opacity-70" : "opacity-100"}`}
      style={style}
      data-report-color-photo={cutoutPending ? "pending" : "ready"}
    />
  );

  if (quiet) {
    return image;
  }

  return (
    <div className="relative flex h-full min-h-[inherit] w-full items-center justify-center" aria-busy={cutoutPending}>
      {cutoutPending ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
          <LoadingSpinner className="h-4 w-4" />
        </div>
      ) : null}
      {image}
    </div>
  );
}
