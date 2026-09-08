import type { ColorPhotoMap } from "@/features/catalog/lib/colorPhotos";
import { colorPhoto, colorReportLabel } from "@/features/catalog/lib/vehicleColor";
import { colorGridRows, orderedReportColors } from "@onroad/shared/quote/colorGridLayout";
import { ReportColorPhoto } from "./ReportColorPhoto";

type LabelPosition = "below" | "left" | "right";

function labelPositionForCell(colIndex: number, colCount: number): LabelPosition {
  if (colCount < 2) {
    return "below";
  }
  return colIndex === 0 ? "left" : "right";
}

function ColorGridCell({
  name,
  photoSrc,
  compact,
  labelPosition = "below",
  quiet = false,
}: {
  name: string;
  photoSrc: string;
  compact?: boolean;
  labelPosition?: LabelPosition;
  quiet?: boolean;
}) {
  const labelClass = `shrink-0 font-black uppercase leading-none tracking-wide text-[#1f1f1f] ${compact ? "text-[10px]" : "text-[11px]"}`;
  const photoClass = `block h-full max-h-full w-full max-w-full object-contain object-center ${quiet ? "" : "drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)]"}`;
  const label = <p className={`${labelClass} self-center`}>{colorReportLabel(name)}</p>;
  const photo = (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <ReportColorPhoto src={photoSrc} alt={name} quiet={quiet} className={photoClass} />
    </div>
  );

  if (labelPosition === "left" || labelPosition === "right") {
    return (
      <div
        className={`flex h-full min-h-0 items-stretch gap-0.5 ${compact ? "px-0.5 py-0" : "px-1 py-0.5"} ${labelPosition === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        {photo}
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${compact ? "px-1 py-0.5" : "px-1.5 py-1"}`}>
      {photo}
      <p className={`shrink-0 text-center ${labelClass} ${compact ? "mt-0.5" : "mt-1"}`}>
        {colorReportLabel(name)}
      </p>
    </div>
  );
}

export function QuoteColorGrid({
  colorNames,
  colorPhotos,
  compact = false,
  quiet = false,
}: {
  colorNames: string[];
  colorPhotos?: ColorPhotoMap | null;
  compact?: boolean;
  quiet?: boolean;
}) {
  const colors = orderedReportColors(colorNames);
  const rows = colorGridRows(colors.length);

  if (!rows.length) {
    return <div className="h-full w-full bg-white" />;
  }

  const maxCols = Math.max(...rows.map((entry) => entry.length));

  return (
    <div
      className={`box-border h-full w-full overflow-hidden border border-[#1f1f1f] bg-white ${compact ? "min-h-0 p-0.5" : "min-h-[18.5rem] p-1"}`}
    >
      <div
        className="grid h-full min-h-0 w-full"
        style={{
          gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))`,
        }}
      >
        {rows.flatMap((row) =>
          row.map((colorIndex, colIndex) => {
            const name = colors[colorIndex]!;
            const isShortRow = row.length < maxCols;
            return (
              <div
                key={`${name}-${colorIndex}`}
                className={`min-h-0 min-w-0 overflow-hidden ${isShortRow ? "col-span-full flex justify-center" : ""}`}
              >
                <div className={`h-full min-h-0 ${isShortRow ? "w-1/2" : "w-full"}`}>
                  <ColorGridCell
                    compact={compact}
                    quiet={quiet}
                    labelPosition={labelPositionForCell(colIndex, row.length)}
                    name={name}
                    photoSrc={colorPhoto(name, colorPhotos)}
                  />
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
