import { isCustomerRelationshipType } from "./customerRelationships";

import type { CustomerRelationshipType } from "./customerRelationships";
import type { StructuredAddress } from "./customerAddress";

export type CustomerInput = {
  fullName?: string;
  phone?: string;
  permanentAddress?: StructuredAddress;
  temporaryAddress?: StructuredAddress;
  notes?: string;
  relationships?: {
    relatedCustomerId?: number;
    relationshipType?: CustomerRelationshipType;
    note?: string;
  }[];
};

export type CustomerValidationErrors = Partial<
  Record<
    | "fullName"
    | "permanentAddress"
    | "temporaryAddress"
    | "relationships",
    string
  >
>;

function validateStructuredAddress(
  address: StructuredAddress | undefined,
  key: "permanentAddress" | "temporaryAddress",
  errors: CustomerValidationErrors,
) {
  if (!address) {
    return;
  }
  if (address.locationId && !address.districtId) {
    errors[key] = "districtRequired";
  }
  if (address.districtId && !address.locationId) {
    errors[key] = "locationRequired";
  }
}

export function validateCustomerInput(input: CustomerInput): CustomerValidationErrors {
  const errors: CustomerValidationErrors = {};
  if (!input.fullName?.trim()) {
    errors.fullName = "required";
  }
  validateStructuredAddress(input.permanentAddress, "permanentAddress", errors);
  validateStructuredAddress(input.temporaryAddress, "temporaryAddress", errors);
  const relationships = input.relationships ?? [];
  const invalidRelationship = relationships.find(
    (item) =>
      !item.relatedCustomerId ||
      !item.relationshipType ||
      !isCustomerRelationshipType(item.relationshipType),
  );
  if (invalidRelationship) {
    errors.relationships = "invalid";
  }
  return errors;
}
