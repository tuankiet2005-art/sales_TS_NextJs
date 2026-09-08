export type CustomerAddressKind = "PERMANENT" | "TEMPORARY";

export interface StructuredAddress {
  streetLine: string;
  locationId?: number;
  districtId?: number;
}
