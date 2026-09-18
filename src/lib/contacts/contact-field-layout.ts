/** Shared Contact Details / coverage-record label|value grid. */

/** Wide enough for “Homeowners” / “Business Owner” without colliding with the value. */
export const CONTACT_LABEL_COL = "10.5rem";

export const CONTACT_LABEL_VALUE_GRID =
  "grid grid-cols-[10.5rem_minmax(0,1fr)] items-stretch";

export function isLongContactTextField(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k === "email" ||
    k.endsWith("_email") ||
    k === "website" ||
    k.endsWith("_website")
  );
}
