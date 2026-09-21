import { homeLineLabel } from "@/lib/home/lines";

/** Policy type on a renewal card — line of business, never the bare word Policy. */
export function renewalPolicyTypeLabel(input: {
  lineOfBusiness?: string | null;
  policySubType?: string | null;
  insuranceType?: string | null;
}): string {
  const raw = (input.lineOfBusiness ?? "").trim();
  const base = raw ? homeLineLabel(raw) : "";
  const sub = (input.policySubType || input.insuranceType || "").trim();
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
