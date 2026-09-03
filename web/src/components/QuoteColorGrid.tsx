import type { ColorPhotoMap } from "../lib/colorPhotos";
import { colorGridRows, orderedReportColors } from "../lib/colorGridLayout";
import { colorPhoto, colorReportLabel } from "../lib/vehicleColor";
import { ReportColorPhoto } from "./ReportColorPhoto";

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
      <div className="flex h-full w-full min-h-0 items-center justify-center p-1">
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
  const colors = orderedReportColors(colorNames);
  const rows = colorGridRows(colors.length);
  const showInternalBorders = !photosOnly && !frameless && colors.length === 4;

  if (!rows.length) {
    return <div className="h-full w-full bg-white" />;
  }

  return (
    <div
      className={`flex h-full w-full flex-col bg-white ${frameless || photosOnly ? "" : "border border-[#1f1f1f]"} ${compact ? "min-h-0" : "min-h-[18.5rem]"}`}
    >
      {rows.map((row, rowIndex) => {
        const maxCols = Math.max(...rows.map((entry) => entry.length));
        const centerRow = row.length < maxCols;

        return (
          <div
            key={`row-${rowIndex}`}
            className={`flex min-h-0 flex-1 ${centerRow ? "justify-center" : ""} ${showInternalBorders && rowIndex === 0 ? "border-b border-[#1f1f1f]" : ""}`}
          >
            {row.map((colorIndex, colIndex) => {
              const name = colors[colorIndex]!;
              const cellBorder =
                showInternalBorders && colIndex === 0 && row.length > 1
                  ? "border-r border-[#1f1f1f]"
                  : "";
              return (
                <div
                  key={`${name}-${colorIndex}`}
                  className={`h-full min-h-0 ${cellBorder}`}
                  style={{ flex: `1 1 ${100 / maxCols}%` }}
                >
                  <ColorGridCell
                    compact={compact}
                    photosOnly={photosOnly}
                    name={name}
                    photoSrc={colorPhoto(name, colorPhotos)}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
