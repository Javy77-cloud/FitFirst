import { formatDay, lineLabel } from "@/lib/domain";
import type { Policy } from "@/lib/db/schema";
import type { PortalBrand } from "./session";

export type IdCardStub = {
  agencyName: string;
  agencyPhone: string;
  insuredName: string;
  policyNumber: string;
  carrierName: string;
  lineLabel: string;
  effectiveDate: string;
  expirationDate: string;
  documentId: string | null;
  filename: string | null;
};

export function buildIdCardStub(input: {
  policy: Pick<Policy, "policyNumber" | "lineOfBusiness" | "effectiveDate" | "expirationDate">;
  insuredName: string;
  carrierName: string;
  brand: PortalBrand;
  documentId?: string | null;
  filename?: string | null;
}): IdCardStub {
  return {
    agencyName: input.brand.agencyName,
    agencyPhone: input.brand.phone,
    insuredName: input.insuredName,
    policyNumber: input.policy.policyNumber,
    carrierName: input.carrierName || "Carrier on file",
    lineLabel: lineLabel(input.policy.lineOfBusiness),
    effectiveDate: formatDay(input.policy.effectiveDate),
    expirationDate: formatDay(input.policy.expirationDate),
    documentId: input.documentId ?? null,
    filename: input.filename ?? null,
  };
}
