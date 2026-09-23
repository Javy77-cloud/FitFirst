/** Sensitive Overview fields — admin must confirm before save (renewal / billing impact). */
export const POLICY_SENSITIVE_INLINE_KEYS = [
  "policyNumber",
] as const;

export type PolicySensitiveInlineKey = (typeof POLICY_SENSITIVE_INLINE_KEYS)[number];

export function isPolicySensitiveInlineKey(key: string): key is PolicySensitiveInlineKey {
  return (POLICY_SENSITIVE_INLINE_KEYS as readonly string[]).includes(key);
}

export function sensitiveFieldConfirmCopy(fieldKey: string): string {
  if (fieldKey === "policyNumber") {
    return "Changing the policy number updates carrier matching and documents linked to this record. Confirm to save.";
  }
  return "Confirm this change before saving.";
}
