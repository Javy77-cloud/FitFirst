/** Normalize a VIN for NHTSA vPIC (17 chars, no separators). */
export function normalizeVin(raw?: string | null): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/g, "");
}

export function isDecodableVin(raw?: string | null): boolean {
  const vin = normalizeVin(raw);
  return vin.length === 17;
}

/** Title-case Make for desk display (ACURA → Acura). Keep short all-caps models. */
export function titleCaseMake(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  return text
    .toLowerCase()
    .split(/(\s+|-+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part === "-") return part;
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}
