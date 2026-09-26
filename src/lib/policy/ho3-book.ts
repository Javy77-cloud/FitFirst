/**
 * Which policies the HO3 book Fill-from-DEC pass may touch.
 * Form code comes from the same parser policy labels use (#450).
 * HO3 Wind Only, HO6, DP, flood, and auto stay out.
 */
import { policyFormCode, type PolicyFormLabelInput } from "@/lib/policy/form-label";

/** Written on the fill audit. Manual fills require a reason. Overwrite is allowed. */
export const HO3_BOOK_FILL_REASON =
  "Book HO3 Fill-from-DEC. Javy green light 2026-09-25. Overwrite on re-run. HO3 only.";

/** Desk user who has been running Fill-from-DEC. The script looks this name up; it does not invent an actor. */
export const HO3_BOOK_FILL_ACTOR = "Javier Garcia";

function labeled(input: PolicyFormLabelInput): string {
  return [input.formType, input.policySubType, input.subType, input.policyType, input.lineOfBusiness]
    .map((value) => value ?? "")
    .join(" ");
}

function formCodes(input: PolicyFormLabelInput): string[] {
  const sub = input.policySubType ?? input.subType;
  return [input.formType, sub, input.policyType, input.lineOfBusiness]
    .map((value) => policyFormCode(value))
    .filter((code): code is string => Boolean(code));
}

/**
 * True only when every recognized form code on the policy is HO3
 * and at least one field is HO3. "Home" alone is not HO3.
 * "HO3 Wind Only" is not HO3.
 */
export function isBookHo3Policy(input: PolicyFormLabelInput): boolean {
  if (/wind\s*only/i.test(labeled(input))) return false;
  const line = (input.lineOfBusiness ?? "").trim().toUpperCase();
  if (line === "AUTO" || line === "FLOOD" || line === "DP") return false;
  const codes = formCodes(input);
  if (!codes.length) return false;
  return codes.every((code) => code === "HO3");
}

/** Why a policy is outside this pass. Null when it is book HO3. */
export function ho3BookExclusionReason(input: PolicyFormLabelInput): string | null {
  if (isBookHo3Policy(input)) return null;
  const text = labeled(input);
  if (/wind\s*only/i.test(text)) return "HO3 Wind Only";
  const codes = formCodes(input);
  if (codes.includes("HO6")) return "HO6";
  const dp = codes.find((code) => code.startsWith("DP"));
  if (dp) return dp;
  if (codes.includes("MHO")) return "MHO";
  if (codes.includes("Auto")) return "Auto";
  const line = (input.lineOfBusiness ?? "").trim().toUpperCase();
  if (line === "AUTO") return "Auto";
  if (line === "FLOOD" || /flood/i.test(text)) return "flood";
  if (line === "DP") return "DP";
  if (line === "HO" || /home/i.test(text)) return "home, not form HO3";
  return "not HO3";
}
