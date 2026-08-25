import { describe, expect, it } from "vitest";

import {
  pickBestRelationshipDiscount,
  relationshipDiscountAmount,
  quoteDiscountWithRelationship,
} from "./customerRelationshipDiscount";

describe("customerRelationshipDiscount", () => {
  it("computes percent of list price", () => {
    expect(relationshipDiscountAmount(500_000_000, 2)).toBe(10_000_000);
  });

  it("picks the highest eligible relationship discount", () => {
    const offer = pickBestRelationshipDiscount(
      [
        {
          relationshipType: "SPOUSE",
          relatedCustomerId: 1,
          relatedCustomerName: "Lan",
          hasPurchase: true,
        },
        {
          relationshipType: "REFERRER",
          relatedCustomerId: 2,
          relatedCustomerName: "Minh",
          hasPurchase: true,
        },
      ],
      500_000_000,
    );
    expect(offer?.relationshipType).toBe("REFERRER");
    expect(offer?.discountAmount).toBe(10_000_000);
  });

  it("ignores related customers without purchases", () => {
    const offer = pickBestRelationshipDiscount(
      [
        {
          relationshipType: "REFERRER",
          relatedCustomerId: 2,
          relatedCustomerName: "Minh",
          hasPurchase: false,
        },
      ],
      500_000_000,
    );
    expect(offer).toBeNull();
  });

  it("adds relationship amount on top of policy discount", () => {
    expect(
      quoteDiscountWithRelationship(25_000_000, {
        relationshipType: "SPOUSE",
        relatedCustomerId: 1,
        relatedCustomerName: "Lan",
        discountPercent: 1,
        discountAmount: 5_000_000,
      }),
    ).toBe(30_000_000);
  });
});
