import type { ColorPhotoMap } from "../lib/colorPhotos";
import { colorPhoto, colorReportLabel } from "../lib/vehicleColor";
import { ReportColorPhoto } from "./ReportColorPhoto";

/** Excel quote-sheet slot order: top-left → top-right → bottom-left → bottom-right. */
const REPORT_COLOR_SLOTS = ["Bạc", "Nâu", "Đen", "Trắng"] as const;

function slotColors(colorNames: string[]): string[] {
  const available = colorNames.map((name) => name.trim()).filter(Boolean);
  const set = new Set(available);
  const slots = REPORT_COLOR_SLOTS.map((name) => (set.has(name) ? name : ""));
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

function ColorGridCell({ name, photoSrc }: { name: string; photoSrc: string }) {
  return (
    <div className="flex h-full min-h-[9.25rem] flex-col items-stretch justify-end px-1.5 pb-1.5 pt-1">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <ReportColorPhoto
          src={photoSrc}
          alt={name}
          className="h-full max-h-[7.25rem] w-full object-contain object-center drop-shadow-[0_6px_10px_rgba(0,0,0,0.2)]"
        />
      </div>
      <p className="mt-1 shrink-0 text-center text-[12px] font-black uppercase leading-tight tracking-wide text-[#1f1f1f]">
        {colorReportLabel(name)}
      </p>
    </div>
  );
}

export function QuoteColorGrid({
  colorNames,
  colorPhotos,
}: {
  colorNames: string[];
  colorPhotos?: ColorPhotoMap | null;
}) {
  const slots = slotColors(colorNames);

  return (
    <div className="grid h-full min-h-[18.5rem] grid-cols-2 grid-rows-2 border border-[#1f1f1f] bg-white">
      {slots.map((name, index) => {
        const cellBorder =
          index === 0
            ? "border-r border-b border-[#1f1f1f]"
            : index === 1
              ? "border-b border-[#1f1f1f]"
              : index === 2
                ? "border-r border-[#1f1f1f]"
                : "";
        return (
          <div key={`${name || "empty"}-${index}`} className={`h-full ${cellBorder}`}>
            {name ? <ColorGridCell name={name} photoSrc={colorPhoto(name, colorPhotos)} /> : null}
          </div>
        );
      })}
    </div>
  );
}
