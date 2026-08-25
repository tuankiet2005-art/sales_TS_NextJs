import { describe, expect, it } from "vitest";

import {
  composeCustomerAddress,
  extractStreetFromAddress,
  matchDistrictFromAddress,
} from "./customerAddress";
import type { Location, LocationDistrict } from "../types";

const location: Location = {
  id: 1,
  code: "HN",
  name: "Hà Nội",
  nameEn: "Ha Noi",
  nameZh: "河内",
  nameJa: "ハノイ",
  region: "NORTH",
  feeZone: "I",
  centrallyGovernedCity: true,
};

const district: LocationDistrict = {
  id: 10,
  locationId: 1,
  code: "CG",
  name: "Cầu Giấy",
  nameEn: "Cau Giay",
  nameZh: "纸桥",
  nameJa: "カウザイ",
};

describe("composeCustomerAddress", () => {
  it("joins street, district, and province", () => {
    expect(composeCustomerAddress(district, location, "vi", "12 Nguyễn Huệ")).toBe(
      "12 Nguyễn Huệ, Cầu Giấy, Hà Nội",
    );
  });

  it("omits street when blank and keeps district plus province", () => {
    expect(composeCustomerAddress(district, location, "vi", "  ")).toBe("Cầu Giấy, Hà Nội");
  });

  it("keeps street when locality is missing", () => {
    expect(composeCustomerAddress(undefined, location, "vi", "12 Nguyễn Huệ")).toBe("12 Nguyễn Huệ");
  });
});

describe("extractStreetFromAddress", () => {
  it("pulls the street prefix off a composed address", () => {
    expect(
      extractStreetFromAddress("12 Nguyễn Huệ, Cầu Giấy, Hà Nội", district, location, "vi"),
    ).toBe("12 Nguyễn Huệ");
  });

  it("returns empty when the address is only locality", () => {
    expect(extractStreetFromAddress("Cầu Giấy, Hà Nội", district, location, "vi")).toBe("");
  });
});

describe("matchDistrictFromAddress", () => {
  it("matches a district when a street prefix is present", () => {
    expect(
      matchDistrictFromAddress("12 Nguyễn Huệ, Cầu Giấy, Hà Nội", [district], location, "vi")?.id,
    ).toBe(10);
  });

  it("still matches a locality-only address", () => {
    expect(matchDistrictFromAddress("Cầu Giấy, Hà Nội", [district], location, "vi")?.id).toBe(10);
  });
});
