export const CUSTOMER_RELATIONSHIP_TYPES = [
  "SPOUSE",
  "PARENT",
  "CHILD",
  "SIBLING",
  "REFERRER",
  "COLLEAGUE",
] as const;

export type CustomerRelationshipType = (typeof CUSTOMER_RELATIONSHIP_TYPES)[number];

export function isCustomerRelationshipType(value: string): value is CustomerRelationshipType {
  return (CUSTOMER_RELATIONSHIP_TYPES as readonly string[]).includes(value);
}
