import { addressFingerprint } from "./compare";
import { addressFillForKey } from "./keys";
import type { ParsedAddress } from "./types";

export const ADDRESS_VERIFY_SUFFIX = "__verify";
export const ADDRESS_CONFIRMED_SUFFIX = "__confirmed";

export type AddressVerifyPersistStatus = "confirmed" | "updated" | "not_verified";

export type AddressVerifyMeta = {
  status: AddressVerifyPersistStatus;
  fingerprint: string;
};

export function addressVerifyFieldKey(streetKey: string): string {
  const key = String(streetKey ?? "").replace(/^field_/i, "");
  return `${key}${ADDRESS_VERIFY_SUFFIX}`;
}

export function parseAddressVerifyMeta(raw: unknown): AddressVerifyMeta | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  if (text === "1" || text === "true" || text === "confirmed") {
    return { status: "confirmed", fingerprint: "" };
  }
  try {
    const row = JSON.parse(text) as Partial<AddressVerifyMeta>;
    if (row.status === "confirmed" || row.status === "updated" || row.status === "not_verified") {
      return { status: row.status, fingerprint: String(row.fingerprint ?? "") };
    }
  } catch {
    return null;
  }
  return null;
}

export function serializeAddressVerifyMeta(meta: AddressVerifyMeta): string {
  return JSON.stringify({
    status: meta.status,
    fingerprint: meta.fingerprint ?? "",
  });
}

export function verifyMetaForAddressKey(
  streetKey: string,
  values: Record<string, string | null | undefined> | null | undefined,
): string {
  const bag = values ?? {};
  const key = addressVerifyFieldKey(streetKey);
  return String(bag[key] ?? bag[`${streetKey}${ADDRESS_CONFIRMED_SUFFIX}`] ?? "");
}

/**
 * A stored "confirmed" fingerprint for a different street must not paint this
 * field confirmed. Gloria's insured street is 8944 while the fingerprint is
 * 16021; saving that meta writes the other street back as verified.
 */
export function verifyMetaForCurrentAddress(
  streetKey: string,
  values: Record<string, string | null | undefined> | null | undefined,
): string {
  const raw = verifyMetaForAddressKey(streetKey, values);
  const meta = parseAddressVerifyMeta(raw);
  if (!meta?.fingerprint) return raw;
  const bag = values ?? {};
  const fill = addressFillForKey(streetKey);
  const current: ParsedAddress = {
    street: String(bag[streetKey] ?? ""),
    city: String(bag[fill.city ?? ""] ?? ""),
    state: String(bag[fill.state ?? ""] ?? ""),
    zip: String(bag[fill.zip ?? ""] ?? ""),
    county: String(bag[fill.county ?? ""] ?? ""),
    country: "US",
  };
  if (!metaMatchesAddress(meta, current)) return "";
  return raw;
}

/** Hidden `field_<street>__verify` / `__confirmed` posts — persist without a catalog field. */
export function addressVerifyValuesFromForm(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawName, rawValue] of form.entries()) {
    if (typeof rawValue !== "string") continue;
    const name = String(rawName).replace(/^field_/i, "");
    if (name.endsWith(ADDRESS_VERIFY_SUFFIX)) {
      const meta = parseAddressVerifyMeta(rawValue);
      out[name] = meta ? serializeAddressVerifyMeta(meta) : "";
      continue;
    }
    if (name.endsWith(ADDRESS_CONFIRMED_SUFFIX)) {
      const streetKey = name.slice(0, -ADDRESS_CONFIRMED_SUFFIX.length);
      const verifyKey = addressVerifyFieldKey(streetKey);
      if (out[verifyKey]) continue;
      if (rawValue === "1" || rawValue === "true") {
        out[verifyKey] = serializeAddressVerifyMeta({ status: "confirmed", fingerprint: "" });
      }
    }
  }
  return out;
}

export function metaMatchesAddress(
  meta: AddressVerifyMeta | null,
  address: ParsedAddress,
): boolean {
  if (!meta) return false;
  if (!meta.fingerprint) {
    return meta.status === "confirmed" || meta.status === "updated";
  }
  return meta.fingerprint === addressFingerprint(address);
}
