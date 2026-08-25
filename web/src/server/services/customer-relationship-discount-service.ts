import { eq, inArray } from "drizzle-orm";

import {
  pickBestRelationshipDiscount,
  type RelationshipDiscountCandidate,
  type RelationshipDiscountOffer,
} from "@/lib/customerRelationshipDiscount";
import type { CustomerRelationshipType } from "@/lib/customerRelationships";
import { getDb } from "../db/client";
import { customerRelationships, customers, quoteHistory } from "../db/schema";

async function loadRelationshipCandidates(customerId: number): Promise<RelationshipDiscountCandidate[]> {
  const db = getDb();
  const outgoing = await db
    .select({
      relationshipType: customerRelationships.relationshipType,
      relatedCustomerId: customers.id,
      relatedCustomerName: customers.fullName,
    })
    .from(customerRelationships)
    .innerJoin(customers, eq(customerRelationships.relatedCustomerId, customers.id))
    .where(eq(customerRelationships.customerId, customerId));

  const incoming = await db
    .select({
      relationshipType: customerRelationships.relationshipType,
      relatedCustomerId: customers.id,
      relatedCustomerName: customers.fullName,
    })
    .from(customerRelationships)
    .innerJoin(customers, eq(customerRelationships.customerId, customers.id))
    .where(eq(customerRelationships.relatedCustomerId, customerId));

  const merged = new Map<number, RelationshipDiscountCandidate>();
  for (const row of [...outgoing, ...incoming]) {
    merged.set(row.relatedCustomerId, {
      relationshipType: row.relationshipType as CustomerRelationshipType,
      relatedCustomerId: row.relatedCustomerId,
      relatedCustomerName: row.relatedCustomerName,
      hasPurchase: false,
    });
  }
  return [...merged.values()];
}

async function markPurchases(candidates: RelationshipDiscountCandidate[]): Promise<RelationshipDiscountCandidate[]> {
  const relatedIds = candidates.map((item) => item.relatedCustomerId);
  if (relatedIds.length === 0) {
    return candidates;
  }
  const db = getDb();
  const rows = await db
    .selectDistinct({ customerId: quoteHistory.customerId })
    .from(quoteHistory)
    .where(inArray(quoteHistory.customerId, relatedIds));
  const buyers = new Set(rows.map((row) => row.customerId).filter((id): id is number => id != null));
  return candidates.map((candidate) => ({
    ...candidate,
    hasPurchase: buyers.has(candidate.relatedCustomerId),
  }));
}

export async function resolveCustomerRelationshipDiscount(
  customerId: number,
  listPrice: number,
): Promise<RelationshipDiscountOffer | null> {
  const candidates = await markPurchases(await loadRelationshipCandidates(customerId));
  return pickBestRelationshipDiscount(candidates, listPrice);
}
