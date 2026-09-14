/** Detect the Insurance Quote Request / Insurance Type cascade section. */
export function isInsuranceQuoteRequestSection(section: {
  id?: string | null;
  label?: string | null;
  fieldKeys?: string[] | null;
}): boolean {
  const label = (section.label ?? "").trim();
  if (/insurance quote request/i.test(label)) return true;
  if (/^insurance type$/i.test(label)) return true;
  const keys = section.fieldKeys ?? [];
  if (
    keys.includes("insurance_type") &&
    (section.id === "details" || /^details$/i.test(label))
  ) {
    return true;
  }
  return false;
}

/** FitFirst light-blue used on check/comms surfaces (#e0f2fe / sky). */
export const INSURANCE_QUOTE_SECTION_STYLE = {
  background: "#e0f2fe",
  borderColor: "#9ec9e8",
  boxShadow: "0 1px 2px rgba(15, 39, 68, 0.06), 0 4px 12px rgba(29, 78, 137, 0.10)",
} as const;
