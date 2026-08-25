"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n/LanguageContext";
import { motionInteractive, motionPress } from "../lib/motion";
import { ColorPhotoImage } from "./ColorPhotoImage";

export function VehicleImageSlideshow({
  slides,
  alt,
  preferredIndex = 0,
  wrapperClassName = "aspect-[16/10] overflow-hidden rounded-3xl bg-mist shadow-card motion-scale-in",
}: {
  slides: string[];
  alt: string;
  preferredIndex?: number;
  wrapperClassName?: string;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const current = total > 0 ? slides[Math.min(index, total - 1)] : "";

  useEffect(() => {
    if (total === 0) {
      setIndex(0);
      return;
    }
    setIndex(Math.min(Math.max(preferredIndex, 0), total - 1));
  }, [preferredIndex, total, slides.join("|")]);

  if (total === 0) {
    return null;
  }

  function go(delta: number) {
    setIndex((currentIndex) => (currentIndex + delta + total) % total);
  }

  const showControls = total > 1;

  return (
    <div className={`group relative ${wrapperClassName}`}>
      <ColorPhotoImage
        key={current}
        src={current}
        alt={alt}
        wrapperClassName="h-full w-full"
        imgClassName="h-full w-full object-contain object-center bg-paper"
        spinnerSize="lg"
      />

      {showControls ? (
        <>
          <button
            type="button"
            aria-label={t("slideshowPrev")}
            onClick={() => go(-1)}
            className={`absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-card opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${motionInteractive} ${motionPress}`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t("slideshowNext")}
            onClick={() => go(1)}
            className={`absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-card opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${motionInteractive} ${motionPress}`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ink/35 to-transparent px-4 pb-3 pt-10">
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {slides.map((slide, slideIndex) => (
                  <button
                    key={`${slide}-${slideIndex}`}
                    type="button"
                    aria-label={`${t("slideshowGoTo")} ${slideIndex + 1}`}
                    aria-current={slideIndex === index ? "true" : undefined}
                    onClick={() => setIndex(slideIndex)}
                    className={`pointer-events-auto h-2 rounded-full transition-all duration-300 ease-motion ${
                      slideIndex === index ? "w-5 bg-paper" : "w-2 bg-paper/55 hover:bg-paper/80"
                    }`}
                  />
                ))}
              </div>
              <p className="rounded-full bg-paper/90 px-2.5 py-1 text-xs font-semibold text-ink/70">
                {index + 1} / {total}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
