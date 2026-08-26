"use client";

import { useEffect, useMemo, useState } from "react";
import { toReportColorPhotoSrc } from "../lib/reportColorPhoto";
import { LoadingSpinner } from "./LoadingState";

export function ReportColorPhoto({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const reportSrc = useMemo(() => toReportColorPhotoSrc(src), [src]);
  const usesReportApi = reportSrc !== src;
  const [displaySrc, setDisplaySrc] = useState(usesReportApi ? "" : src);
  const [loading, setLoading] = useState(Boolean(usesReportApi && src));
  const [ready, setReady] = useState(!usesReportApi);

  useEffect(() => {
    if (!src) {
      setDisplaySrc("");
      setLoading(false);
      setReady(true);
      return;
    }

    if (!usesReportApi) {
      setDisplaySrc(src);
      setLoading(false);
      setReady(true);
      return;
    }

    setLoading(true);
    setReady(false);
    setDisplaySrc("");
    let cancelled = false;
    const image = new window.Image();

    function finishWith(url: string, succeeded: boolean) {
      if (cancelled) {
        return;
      }
      setDisplaySrc(url);
      setLoading(false);
      setReady(succeeded);
    }

    image.onload = () => finishWith(reportSrc, true);
    image.onerror = () => finishWith(src, false);
    image.src = reportSrc;

    if (image.complete && image.naturalWidth > 0) {
      finishWith(reportSrc, true);
    }

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [reportSrc, src, usesReportApi]);

  if (!displaySrc) {
    return (
      <div className="relative flex h-full w-full items-center justify-center" aria-busy={loading}>
        <LoadingSpinner className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[inherit] w-full items-center justify-center" aria-busy={loading}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
          <LoadingSpinner className="h-4 w-4" />
        </div>
      ) : null}
      <img
        src={displaySrc}
        alt={alt}
        className={`${className} ${loading ? "opacity-0" : "opacity-100"}`}
        data-report-color-photo={ready ? "ready" : "pending"}
      />
    </div>
  );
}
