import type { Lang } from "../i18n/translations";
import type { Customer, Location, LocationDistrict } from "../types";
import { districtLabel, locationLabel } from "./labels";

export type CustomerAddressKind = "PERMANENT" | "TEMPORARY";

export interface StructuredAddress {
  streetLine: string;
  locationId?: number;
  districtId?: number;
}

export type CustomerFieldValues = {
  customerId?: number;
  fullName: string;
  phone: string;
  permanentAddress: StructuredAddress;
  temporaryAddress: StructuredAddress;
  deliveryAddressKind?: CustomerAddressKind;
};

export function emptyStructuredAddress(): StructuredAddress {
  return { streetLine: "" };
}

export function emptyCustomerFields(): CustomerFieldValues {
  return {
    fullName: "",
    phone: "",
    permanentAddress: emptyStructuredAddress(),
    temporaryAddress: emptyStructuredAddress(),
  };
}

export function structuredAddressFromCustomer(
  customer: Customer,
  kind: CustomerAddressKind,
): StructuredAddress {
  const source = kind === "PERMANENT" ? customer.permanentAddress : customer.temporaryAddress;
  return {
    streetLine: source.streetLine ?? "",
    locationId: source.locationId,
    districtId: source.districtId,
  };
}

export function customerFieldsFromCustomer(customer: Customer): CustomerFieldValues {
  const permanent = structuredAddressFromCustomer(customer, "PERMANENT");
  const temporary = structuredAddressFromCustomer(customer, "TEMPORARY");
  const deliveryAddressKind = addressHasLocality(permanent)
    ? "PERMANENT"
    : addressHasLocality(temporary)
      ? "TEMPORARY"
      : undefined;
  return {
    customerId: customer.id,
    fullName: customer.fullName,
    phone: customer.phone ?? "",
    permanentAddress: permanent,
    temporaryAddress: temporary,
    deliveryAddressKind,
  };
}

export function resolveDeliveryAddress(value: CustomerFieldValues): StructuredAddress {
  if (value.deliveryAddressKind === "TEMPORARY") {
    return value.temporaryAddress;
  }
  if (value.deliveryAddressKind === "PERMANENT") {
    return value.permanentAddress;
  }
  return emptyStructuredAddress();
}

export function addressHasLocality(address: StructuredAddress): boolean {
  return Boolean(address.locationId && address.districtId);
}

export function addressHasContent(address: StructuredAddress): boolean {
  return Boolean(address.streetLine.trim() || address.locationId || address.districtId);
}

export function resolveQuoteFeeLocation(
  value: CustomerFieldValues,
  fallback: { locationId?: number; districtId?: number },
): { locationId?: number; districtId?: number } {
  const delivery = resolveDeliveryAddress(value);
  if (delivery.locationId && delivery.districtId) {
    return { locationId: delivery.locationId, districtId: delivery.districtId };
  }
  return fallback;
}

function localityLine(
  district: LocationDistrict,
  location: Location,
  lang: Lang,
): string {
  return `${districtLabel(district, lang)}, ${locationLabel(location, lang)}`;
}

function localityCandidates(district: LocationDistrict, location: Location, lang: Lang): string[] {
  const current = localityLine(district, location, lang);
  const vietnamese = `${district.name}, ${location.name}`;
  return current === vietnamese ? [current] : [current, vietnamese];
}

export function composeCustomerAddress(
  district: LocationDistrict | undefined,
  location: Location | undefined,
  lang: Lang,
  streetLine?: string,
): string {
  const street = streetLine?.trim() ?? "";
  const locality = district && location ? localityLine(district, location, lang) : "";
  if (street && locality) {
    return `${street}, ${locality}`;
  }
  return street || locality;
}

export function composeStructuredAddress(
  address: StructuredAddress,
  locations: Location[],
  districts: LocationDistrict[],
  lang: Lang,
): string {
  const location = locations.find((item) => item.id === address.locationId);
  const district = districts.find((item) => item.id === address.districtId);
  return composeCustomerAddress(district, location, lang, address.streetLine);
}

export function extractStreetFromAddress(
  address: string,
  district: LocationDistrict | undefined,
  location: Location | undefined,
  lang: Lang,
): string {
  const trimmed = address.trim();
  if (!trimmed || !district || !location) {
    return "";
  }
  for (const locality of localityCandidates(district, location, lang)) {
    if (trimmed === locality) {
      return "";
    }
    const suffix = `, ${locality}`;
    if (trimmed.endsWith(suffix)) {
      return trimmed.slice(0, trimmed.length - suffix.length).trim();
    }
  }
  return "";
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
  return districts.find((district) => {
    const label = districtLabel(district, lang);
    return localityCandidates(district, location, lang).some((locality) => {
      return (
        trimmed === locality ||
        trimmed.endsWith(`, ${locality}`) ||
        trimmed === label ||
        trimmed === district.name ||
        trimmed.endsWith(`, ${label}`) ||
        trimmed.endsWith(`, ${district.name}`)
      );
    });
  });
}

export function customerInputFromFields(value: CustomerFieldValues) {
  return {
    fullName: value.fullName,
    phone: value.phone,
    permanentAddress: value.permanentAddress,
    temporaryAddress: value.temporaryAddress,
  };
}

