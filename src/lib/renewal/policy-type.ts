import { homeLineLabel } from "@/lib/home/lines";
import { policyFormCode } from "@/lib/policy/form-label";
import { isErrorsOmissionsProduct, policyProductDisplayLabel } from "@/lib/policy/eo";

/** Policy type on a renewal card — form code when known, never the bare word Policy. */
export function renewalPolicyTypeLabel(input: {
  lineOfBusiness?: string | null;
  policySubType?: string | null;
  insuranceType?: string | null;
  formType?: string | null;
  policyType?: string | null;
}): string {
  const form =
    policyFormCode(input.formType) ||
    policyFormCode(input.policySubType) ||
    policyFormCode(input.policyType) ||
    policyFormCode(input.lineOfBusiness);
  if (form) return form;
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
