"use client";

import { ModelTrimPicker } from "./ModelTrimPicker";
import { ModelYearPicker } from "./ModelYearPicker";
import type { VehicleDetail } from "../types";

export function ModelConfigBar({
  years,
  selectedYear,
  onYearChange,
  trims,
  selectedVehicleId,
  onTrimChange,
}: {
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  trims: VehicleDetail[];
  selectedVehicleId: number;
  onTrimChange: (vehicleId: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
        <ModelYearPicker years={years} value={selectedYear} onChange={onYearChange} compact />
        <div className="hidden h-8 w-px shrink-0 bg-ink/10 lg:block" aria-hidden />
        <ModelTrimPicker trims={trims} value={selectedVehicleId} onChange={onTrimChange} compact />
      </div>
    </div>
  );
}
