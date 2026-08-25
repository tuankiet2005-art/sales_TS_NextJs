"use client";

import { ModelTrimPicker } from "./ModelTrimPicker";
import { ModelYearPicker } from "./ModelYearPicker";
import type { VehicleDetail } from "../types";

export function ModelConfigBar({
  trims,
  selectedTrimName,
  onTrimChange,
  years,
  selectedYear,
  onYearChange,
}: {
  trims: VehicleDetail[];
  selectedTrimName: string;
  onTrimChange: (trimName: string) => void;
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
}) {
  const showYears = selectedTrimName.length > 0 && years.length > 0;

  return (
    <div className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
        <ModelTrimPicker trims={trims} value={selectedTrimName} onChange={onTrimChange} compact />
        {showYears ? (
          <>
            <div className="hidden h-8 w-px shrink-0 bg-ink/10 lg:block" aria-hidden />
            <ModelYearPicker years={years} value={selectedYear} onChange={onYearChange} compact />
          </>
        ) : null}
      </div>
    </div>
  );
}
