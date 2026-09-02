"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { QuoteSheetView } from "../lib/quoteSheetView";
import type { VehicleDetail } from "../types";
import { QuoteColorGrid } from "./QuoteColorGrid";
import { LoadingBlock } from "./LoadingState";

export function QuoteSheet({
  view,
  vehicle,
}: {
  view: QuoteSheetView | null;
  vehicle: VehicleDetail;
}) {
  if (!view) {
    return (
      <QuoteSheetScaler width={1099} height={900}>
        <article
          id="quote-sheet"
          className="flex h-full w-full items-center justify-center overflow-hidden bg-white"
        >
          <LoadingBlock message="Đang tải bảng báo giá…" />
        </article>
      </QuoteSheetScaler>
    );
  }

  const occupied = new Set<string>();
  const cellMap = new Map<string, QuoteSheetView["cells"][number]>();
  for (const cell of view.cells) {
    cellMap.set(`${cell.r}:${cell.c}`, cell);
    const colspan = cell.colspan ?? 1;
    const rowspan = cell.rowspan ?? 1;
    for (let row = cell.r; row < cell.r + rowspan; row += 1) {
      for (let col = cell.c; col < cell.c + colspan; col += 1) {
        if (row !== cell.r || col !== cell.c) {
          occupied.add(`${row}:${col}`);
        }
      }
    }
  }

  return (
    <QuoteSheetScaler width={view.width} height={view.height}>
      <article
        id="quote-sheet"
        data-quote-width={view.width}
        data-quote-height={view.height}
        className="relative box-border overflow-hidden bg-white text-[#1f1f1f]"
        style={{ width: view.width, height: view.height }}
      >
        <table
          className="box-border border-collapse"
          style={{ width: view.width, height: view.height, tableLayout: "fixed" }}
        >
          <colgroup>
            {view.columns.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <tbody>
            {view.rows.map((height, rowIndex) => {
              const r = rowIndex + 1;
              return (
                <tr key={r} style={{ height }}>
                  {view.columns.map((_, colIndex) => {
                    const c = colIndex + 1;
                    if (occupied.has(`${r}:${c}`)) {
                      return null;
                    }
                    const cell = cellMap.get(`${r}:${c}`);
                    return (
                      <td
                        key={c}
                        colSpan={cell?.colspan}
                        rowSpan={cell?.rowspan}
                        style={tdStyle(cell?.style, cell?.text)}
                      >
                        {cell?.text}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {view.images.map((image, index) => (
          <img
            key={`img-${index}`}
            src={image.src}
            alt=""
            className="pointer-events-none absolute object-contain"
            style={{
              left: image.left,
              top: image.top,
              width: image.width,
              height: image.height,
            }}
          />
        ))}
        {view.colorGrid ? (
          <div
            className="absolute z-10 box-border overflow-hidden border-r border-[#1f1f1f] bg-white"
            style={view.colorGrid}
          >
            <QuoteColorGrid
              compact
              frameless
              photosOnly
              colorNames={colors(vehicle)}
              colorPhotos={vehicle.colorPhotos}
            />
          </div>
        ) : null}
      </article>
    </QuoteSheetScaler>
  );
}

function QuoteSheetScaler({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const update = () => {
      const available = container.clientWidth;
      const next = available > 0 ? available / width : 1;
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width]);

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  return (
    <div ref={containerRef} className="w-full overflow-hidden print:overflow-visible">
      <div style={{ width: scaledWidth, height: scaledHeight }} className="print:!h-auto print:!w-auto">
        <div
          className="print:!transform-none"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function tdStyle(
  style?: QuoteSheetView["cells"][number]["style"],
  text?: string,
): CSSProperties {
  const excelAlign = style?.textAlign;
  let textAlign: CSSProperties["textAlign"] = "left";
  if (excelAlign === "center" || excelAlign === "right") {
    textAlign = excelAlign;
  } else if (text && /^[\d.,\s]+$/.test(text)) {
    textAlign = "right";
  }

  return {
    background: style?.background,
    color: style?.color ?? "#1f1f1f",
    fontWeight: style?.fontWeight,
    fontSize: style?.fontSize ? `${style.fontSize}px` : "14px",
    fontFamily: "Times New Roman, Times, serif",
    fontStyle: style?.fontStyle,
    textAlign,
    verticalAlign: (style?.verticalAlign as CSSProperties["verticalAlign"]) ?? "middle",
    whiteSpace: (style?.whiteSpace as CSSProperties["whiteSpace"]) ?? "nowrap",
    borderTop: style?.borderTop ?? "none",
    borderRight: style?.borderRight ?? "none",
    borderBottom: style?.borderBottom ?? "none",
    borderLeft: style?.borderLeft ?? "none",
    padding: "2px 8px",
    overflow: "hidden",
    lineHeight: 1.25,
  };
}

function colors(vehicle: VehicleDetail): string[] {
  return (vehicle.availableColors ?? vehicle.defaultColor ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
