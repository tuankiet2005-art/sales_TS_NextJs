import type { ColorPhotoMap } from "./colorPhotos";
import { firstResolvedColorPhoto } from "./colorPhotos";

export const VEHICLE_COLORS: Record<string, string> = {
  Trắng: "#f4f4f4",
  Đen: "#1a1a1a",
  Bạc: "#c5c7ca",
  Xám: "#6b7280",
  Nâu: "#6b3e26",
  Đỏ: "#c00000",
  Cam: "#c45c26",
  Vàng: "#d4a017",
  Xanh: "#1e6b4f",
  "Trắng Đen": "#4a4a4a",
  "Vàng Đen": "#3d3420",
  "Đỏ Đen": "#3d1a1a",
  "Xanh Đen": "#1a2e28",
};

export const VEHICLE_COLOR_PHOTOS: Record<string, string> = {
  Trắng: "/colors/trang.png",
  Bạc: "/colors/bac.png",
  Đen: "/colors/den.png",
  Xám: "/colors/xam.png",
  Nâu: "/colors/nau.png",
  Đỏ: "/colors/do.png",
};

export const VEHICLE_COLOR_PAINT_CODES: Partial<Record<string, string>> = {
  Bạc: "U25",
  Nâu: "C17",
  Đen: "X37",
  Trắng: "W81",
  Xám: "U17",
  Đỏ: "R26",
  Cam: "C06",
  Vàng: "Y35",
  Xanh: "G47",
  "Trắng Đen": "W37",
  "Vàng Đen": "Y37",
  "Đỏ Đen": "R37",
  "Xanh Đen": "G37",
};

export function colorReportLabel(name: string): string {
  const upper = name.toLocaleUpperCase("vi-VN");
  const code = VEHICLE_COLOR_PAINT_CODES[name];
  return code ? `${upper} (${code})` : upper;
}

export function colorPhoto(name?: string, photos?: ColorPhotoMap | null): string {
  if (!name) {
    return "/colors/bac.png";
  }
  const fromVehicle = firstResolvedColorPhoto(photos, name);
  if (fromVehicle) {
    return fromVehicle;
  }
  return VEHICLE_COLOR_PHOTOS[name] ?? "/colors/bac.png";
}

export function colorHex(name?: string): string {
  if (!name) {
    return "#d1d5db";
  }
  return VEHICLE_COLORS[name] ?? "#d1d5db";
}

export function isLightPaint(name?: string): boolean {
  const hex = colorHex(name).replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export function paintLabelClass(_name?: string, selected = false): string {
  if (selected) {
    return "font-bold text-[#1f1f1f]";
  }
  return "font-medium text-[#1f1f1f]";
}
