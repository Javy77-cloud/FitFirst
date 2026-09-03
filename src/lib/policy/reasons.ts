export const ENDORSEMENT_REASONS = [
  { value: "coverage_change", label: "Coverage change" },
  { value: "deductible_change", label: "Deductible change" },
  { value: "additional_interest", label: "Additional interest / mortgagee" },
  { value: "premises_update", label: "Premises / location update" },
  { value: "premium_adjustment", label: "Premium adjustment" },
  { value: "other", label: "Other change in force" },
] as const;

export const CANCELLATION_REASONS = [
  { value: "insured_request", label: "Insured request" },
  { value: "nonpay", label: "Non-pay" },
  { value: "underwriting", label: "Underwriting" },
  { value: "sold", label: "Property sold" },
  { value: "material_misrep", label: "Material misrepresentation" },
  { value: "other", label: "Other cancellation" },
] as const;

export const NON_RENEWAL_REASONS = [
  { value: "carrier_nonrenew", label: "Carrier non-renewal" },
  { value: "underwriting_guidelines", label: "Underwriting guidelines" },
  { value: "claims_history", label: "Claims history" },
  { value: "exposure_change", label: "Exposure change" },
  { value: "market_exit", label: "Carrier market exit" },
  { value: "other", label: "Other non-renewal" },
] as const;

export function reasonLabel(
  kind: "endorsement" | "cancellation" | "non_renewal",
  value: string,
): string {
  const list =
    kind === "endorsement"
      ? ENDORSEMENT_REASONS
      : kind === "cancellation"
        ? CANCELLATION_REASONS
        : NON_RENEWAL_REASONS;
  return list.find((row) => row.value === value)?.label ?? value;
}
