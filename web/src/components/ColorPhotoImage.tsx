"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "./LoadingState";

function useImageLoading(src: string) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const image = new window.Image();

    function finish() {
      if (!cancelled) {
        setLoading(false);
      }
    }

    image.onload = finish;
    image.onerror = finish;
    image.src = src;

    if (image.complete && image.naturalWidth > 0) {
      finish();
    }

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  return loading;
}

export function ColorPhotoImage({
  src,
  alt,
  imgClassName = "",
  wrapperClassName = "",
  spinnerSize = "md",
}: {
  src: string;
  alt: string;
  imgClassName?: string;
  wrapperClassName?: string;
  spinnerSize?: "sm" | "md" | "lg";
}) {
  const loading = useImageLoading(src);
  const spinnerClass = spinnerSize === "sm" ? "h-4 w-4" : spinnerSize === "lg" ? "h-8 w-8" : "h-5 w-5";

  return (
    <div className={`relative ${wrapperClassName}`} aria-busy={loading}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-mist/90 motion-fade-in">
          <LoadingSpinner className={spinnerClass} />
        </div>
      ) : null}
      <img
        src={src}
        alt={alt}
        className={`${imgClassName} ${loading ? "opacity-0" : "opacity-100 motion-fade-in"}`}
      />
    </div>
  );
}
