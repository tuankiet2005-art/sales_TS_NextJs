import { describe, expect, it } from "vitest";

import { validateCustomerInput } from "./customerValidation";

describe("validateCustomerInput", () => {
  it("requires full name", () => {
    expect(validateCustomerInput({ fullName: "  " }).fullName).toBe("required");
  });

  it("requires district when province is set", () => {
    expect(
      validateCustomerInput({
        fullName: "Nguyễn Văn A",
        permanentAddress: { streetLine: "", locationId: 1 },
      }).permanentAddress,
    ).toBe("districtRequired");
  });

  it("accepts a minimal valid customer", () => {
    expect(validateCustomerInput({ fullName: "Nguyễn Văn A", phone: "0901234567" })).toEqual({});
  });
});
