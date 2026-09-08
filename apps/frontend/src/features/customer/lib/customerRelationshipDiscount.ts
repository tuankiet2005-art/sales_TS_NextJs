import type { CustomerRelationshipType } from "./customerRelationships";

/** Extra discount percent when a related customer has a saved showroom purchase. */
export const RELATIONSHIP_DISCOUNT_PERCENTS: Record<CustomerRelationshipType, number> = {
  SPOUSE: 1,
  PARENT: 1.5,
  CHILD: 1.5,
  SIBLING: 1,
  REFERRER: 2,
  COLLEAGUE: 0.5,
};

export interface RelationshipDiscountCandidate {
  relationshipType: CustomerRelationshipType;
  relatedCustomerId: number;
  relatedCustomerName: string;
  hasPurchase: boolean;
}

export interface RelationshipDiscountOffer {
  relationshipType: CustomerRelationshipType;
  relatedCustomerId: number;
  relatedCustomerName: string;
  discountPercent: number;
  discountAmount: number;
}

export function relationshipDiscountPercent(type: CustomerRelationshipType): number {
  return RELATIONSHIP_DISCOUNT_PERCENTS[type] ?? 0;
}

export function relationshipDiscountAmount(listPrice: number, percent: number): number {
  if (!listPrice || !percent) {
    return 0;
  }
  return Math.round((listPrice * percent) / 100);
}

export function pickBestRelationshipDiscount(
  candidates: RelationshipDiscountCandidate[],
  listPrice: number,
): RelationshipDiscountOffer | null {
  let best: RelationshipDiscountOffer | null = null;
  for (const candidate of candidates) {
    if (!candidate.hasPurchase) {
      continue;
    }
    const discountPercent = relationshipDiscountPercent(candidate.relationshipType);
    if (discountPercent <= 0) {
      continue;
    }
    const discountAmount = relationshipDiscountAmount(listPrice, discountPercent);
    if (!best || discountAmount > best.discountAmount) {
      best = {
        relationshipType: candidate.relationshipType,
        relatedCustomerId: candidate.relatedCustomerId,
        relatedCustomerName: candidate.relatedCustomerName,
        discountPercent,
        discountAmount,
      };
    }
  }
  return best;
}

export function quoteDiscountWithRelationship(
  policyDiscountAmount: number,
  relationshipDiscount?: RelationshipDiscountOffer | null,
): number {
  return policyDiscountAmount + (relationshipDiscount?.discountAmount ?? 0);
}
