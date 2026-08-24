import type { Lang } from "../i18n/translations";
import { districtLabel, locationLabel } from "./labels";
import type { Location, LocationDistrict } from "../types";

export function composeCustomerAddress(
  district: LocationDistrict | undefined,
  location: Location | undefined,
  lang: Lang,
): string {
  if (!district || !location) {
    return "";
  }
  const districtName = districtLabel(district, lang);
  const provinceName = locationLabel(location, lang);
  return `${districtName}, ${provinceName}`;
}

export function matchDistrictFromAddress(
  address: string,
  districts: LocationDistrict[],
  location: Location | undefined,
  lang: Lang,
): LocationDistrict | undefined {
  const trimmed = address.trim();
  if (!trimmed || !location) {
    return undefined;
  }
  const provinceName = locationLabel(location, lang);
  const withoutProvince = trimmed.endsWith(provinceName)
    ? trimmed.slice(0, trimmed.length - provinceName.length).replace(/,\s*$/, "").trim()
    : trimmed;
  return districts.find((district) => {
    const label = districtLabel(district, lang);
    return label === withoutProvince || district.name === withoutProvince || trimmed.startsWith(label);
  });
}
