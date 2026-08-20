import type { VehicleDetail } from "../types";

export function vehicleCacheKey(vehicleId: number): string {
  return `onroad-vehicle-${vehicleId}`;
}

export function saveVehicleCache(vehicleId: number, vehicle: VehicleDetail) {
  sessionStorage.setItem(vehicleCacheKey(vehicleId), JSON.stringify(vehicle));
}

export function loadVehicleCache(vehicleId: number): VehicleDetail | null {
  const raw = sessionStorage.getItem(vehicleCacheKey(vehicleId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as VehicleDetail;
  } catch {
    return null;
  }
}
