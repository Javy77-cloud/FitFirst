import { homeLineLabel } from "@/lib/home/lines";
import { isErrorsOmissionsProduct, policyProductDisplayLabel } from "@/lib/policy/eo";

/** Policy type on a renewal card — line of business, never the bare word Policy. */
export function renewalPolicyTypeLabel(input: {
  lineOfBusiness?: string | null;
  policySubType?: string | null;
  insuranceType?: string | null;
  formType?: string | null;
}): string {
  if (isErrorsOmissionsProduct(input.formType, input.policySubType, input.insuranceType)) {
    return "E&O";
  }
  const raw = (input.lineOfBusiness ?? "").trim();
  const base = raw ? homeLineLabel(raw) : "";
  const sub = policyProductDisplayLabel(input.policySubType || input.insuranceType || "");
  if (!base && sub) return sub;
  if (!base) return "Line open";
  if (
    sub &&
    sub.toLowerCase() !== base.toLowerCase() &&
    sub.toLowerCase() !== raw.toLowerCase()
  ) {
    return `${base} · ${sub}`;
  }
  return base;
}
