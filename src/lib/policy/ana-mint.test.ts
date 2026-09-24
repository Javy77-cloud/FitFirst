import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTACT_ID, DEAL_ID, LEAD_ID, RISK_ID } from "@/lib/fixtures/ids";
import { refuseAnaPolicyMint } from "./ana-mint";

describe("Ana Dib mint", () => {
  it("refuses fixture ids and the Ana Dib name, including a second attempt", () => {
    expect(refuseAnaPolicyMint({ dealId: DEAL_ID }).refused).toBe(true);
    expect(refuseAnaPolicyMint({ contactId: CONTACT_ID }).refused).toBe(true);
    expect(refuseAnaPolicyMint({ leadId: LEAD_ID }).refused).toBe(true);
    expect(refuseAnaPolicyMint({ riskId: RISK_ID }).refused).toBe(true);
    expect(refuseAnaPolicyMint({ namedInsured: "Ana Dib", coverageA: 321000 }).refused).toBe(true);
    expect(refuseAnaPolicyMint({ firstName: "Ana", lastName: "Dib" }).refused).toBe(true);
    expect(refuseAnaPolicyMint({ namedInsured: "Ana Dib", coverageA: 321000 }).refused).toBe(true);
  });

  it("does not treat another client's coverage A as Ana", () => {
    expect(refuseAnaPolicyMint({ namedInsured: "Rosa Castellanos", coverageA: 321000 }).refused).toBe(
      false,
    );
  });

  it("is called on the policy mint path before a policy row is written", () => {
    const mint = readFileSync("src/app/actions/policy-mint.ts", "utf8");
    const refuseAt = mint.indexOf("refuseAnaPolicyMint");
    const insertAt = mint.indexOf(".insert(policies)");
    expect(refuseAt).toBeGreaterThan(-1);
    expect(insertAt).toBeGreaterThan(refuseAt);
  });
});
