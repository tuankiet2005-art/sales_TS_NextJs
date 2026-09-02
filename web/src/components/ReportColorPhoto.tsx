"use client";

import { useEffect, useMemo, useState } from "react";
import { loadReportColorPhotoCutout } from "../lib/reportColorPhotoCutout";
import { toReportColorPhotoSrc } from "../lib/reportColorPhoto";
import { LoadingSpinner } from "./LoadingState";

export function ReportColorPhoto({
  src,
  alt,
  className = "",
  quiet = false,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Quote sheet: no spinner — blank until the cutout is ready. */
  quiet?: boolean;
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

    let cancelled = false;
    setLoading(true);
    setReady(false);
    setDisplaySrc("");

    loadReportColorPhotoCutout(reportSrc, src)
      .then((url) => {
        if (cancelled) {
          return;
        }
        setDisplaySrc(url);
        setLoading(false);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setDisplaySrc(src);
        setLoading(false);
        setReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reportSrc, src, usesReportApi]);

  if (!displaySrc) {
    if (quiet) {
      return <div className="h-full w-full bg-white" aria-busy={loading} />;
    }
    return (
      <div className="relative flex h-full w-full items-center justify-center" aria-busy={loading}>
        <LoadingSpinner className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[inherit] w-full items-center justify-center" aria-busy={loading}>
      {loading && !quiet ? (
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
