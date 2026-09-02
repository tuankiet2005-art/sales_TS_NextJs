import type { ColorPhotoMap } from "../lib/colorPhotos";
import { colorPhoto, colorReportLabel } from "../lib/vehicleColor";
import { ReportColorPhoto } from "./ReportColorPhoto";

/** Excel quote-sheet slot order: top-left → top-right → bottom-left → bottom-right. */
const REPORT_COLOR_SLOTS = ["Bạc", "Nâu", "Đen", "Trắng"] as const;

function slotColors(colorNames: string[]): string[] {
  const available = colorNames.map((name) => name.trim()).filter(Boolean);
  const set = new Set(available);
  const slots: string[] = REPORT_COLOR_SLOTS.map((name) => (set.has(name) ? name : ""));
  const extras = available.filter(
    (name) => !REPORT_COLOR_SLOTS.includes(name as (typeof REPORT_COLOR_SLOTS)[number]),
  );
  for (let index = 0; index < slots.length && extras.length > 0; index += 1) {
    if (!slots[index]) {
      slots[index] = extras.shift()!;
    }
  }
  return slots;
}

function ColorGridCell({
  name,
  photoSrc,
  compact,
  photosOnly,
}: {
  name: string;
  photoSrc: string;
  compact?: boolean;
  photosOnly?: boolean;
}) {
  if (photosOnly) {
    return (
      <div className={`flex h-full w-full items-center justify-center ${compact ? "min-h-0 p-1" : "p-2"}`}>
        <ReportColorPhoto
          src={photoSrc}
          alt={name}
          quiet
          className="max-h-full max-w-full object-contain object-center"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col items-stretch justify-end ${compact ? "min-h-0 px-1 pb-1 pt-0.5" : "min-h-[9.25rem] px-1.5 pb-1.5 pt-1"}`}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <ReportColorPhoto
          src={photoSrc}
          alt={name}
          className={`h-full w-full object-contain object-center drop-shadow-[0_6px_10px_rgba(0,0,0,0.2)] ${compact ? "max-h-full" : "max-h-[7.25rem]"}`}
        />
      </div>
      <p
        className={`shrink-0 text-center font-black uppercase leading-tight tracking-wide text-[#1f1f1f] ${compact ? "mt-0.5 text-[12px]" : "mt-1 text-[12px]"}`}
      >
        {colorReportLabel(name)}
      </p>
    </div>
  );
}

export function QuoteColorGrid({
  colorNames,
  colorPhotos,
  compact = false,
  frameless = false,
  photosOnly = false,
}: {
  colorNames: string[];
  colorPhotos?: ColorPhotoMap | null;
  compact?: boolean;
  frameless?: boolean;
  photosOnly?: boolean;
}) {
  const slots = slotColors(colorNames);
  const showInternalBorders = !photosOnly && !frameless;

  return (
    <div
      className={`grid h-full w-full grid-cols-2 grid-rows-2 bg-white ${frameless || photosOnly ? "" : "border border-[#1f1f1f]"} ${compact ? "min-h-0" : "min-h-[18.5rem]"}`}
    >
      {slots.map((name, index) => {
        const cellBorder = !showInternalBorders
          ? ""
          : index === 0
            ? "border-r border-b border-[#1f1f1f]"
            : index === 1
              ? "border-b border-[#1f1f1f]"
              : index === 2
                ? "border-r border-[#1f1f1f]"
                : "";
        return (
          <div key={`${name || "empty"}-${index}`} className={`h-full min-h-0 ${cellBorder}`}>
            {name ? (
              <ColorGridCell
                compact={compact}
                photosOnly={photosOnly}
                name={name}
                photoSrc={colorPhoto(name, colorPhotos)}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
