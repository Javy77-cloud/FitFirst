import { parseAddressParts } from "@/lib/extraction/gemini/map";
import { isEndedStatus, isInForceStatus } from "./status";

export type PremisesParts = {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type PremisesAddressParts = {
  street: string;
  city: string | null;
  state: string | null;
  zip: string | null;
};

function cleanPart(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[.#,/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function zip5(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(0, 5);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function trimTrailingPunctuation(value: string): string {
  return value.replace(/[,\s;]+$/g, "").trim();
}

function parseLooseAddress(raw: string): PremisesAddressParts {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const commaZip = cleaned.match(
    /^(.+?),\s*([A-Za-z .'-]+),\s*([A-Z]{2}),?\s+(\d{5}(?:-\d{4})?)\s*$/,
  );
  if (commaZip) {
    return {
      street: commaZip[1]!.trim(),
      city: commaZip[2]!.trim(),
      state: commaZip[3]!,
      zip: zip5(commaZip[4]),
    };
  }
  const parsed = parseAddressParts(cleaned);
  return {
    street: parsed.street,
    city: parsed.city?.trim() || null,
    state: parsed.state?.trim() || null,
    zip: zip5(parsed.zip) || null,
  };
}

/** Drop city / state / ZIP already sitting on the street line (Rosa doubled Fort Myers). */
export function stripLocalityFromStreet(
  street: string | null | undefined,
  locality: { city?: string | null; state?: string | null; zip?: string | null } = {},
): string {
  let next = (street ?? "").replace(/\s+/g, " ").trim();
  if (!next) return "";

  const parsed = parseLooseAddress(next);
  if (parsed.city || parsed.state || parsed.zip) {
    next = parsed.street;
  }

  const city = (locality.city ?? parsed.city ?? "").trim();
  const state = (locality.state ?? parsed.state ?? "").trim();
  const zip = zip5(locality.zip ?? parsed.zip);
  const tokens = [city, state, zip].filter(Boolean);
  if (!tokens.length) return trimTrailingPunctuation(next);

  const localityPattern = tokens.map(escapeRegExp).join("[\\s,]+");
  next = next.replace(new RegExp(`[\\s,]+${localityPattern}\\s*$`, "i"), "").trim();

  for (const token of [...tokens].reverse()) {
    next = next.replace(new RegExp(`[\\s,]+${escapeRegExp(token)}\\s*$`, "i"), "").trim();
  }

  return trimTrailingPunctuation(next);
}

/** Street + city/state/zip for write. `premises_address` is always street only. */
export function splitPremisesAddress(
  raw: string | null | undefined,
  known: { city?: string | null; state?: string | null; zip?: string | null } = {},
): PremisesAddressParts {
  const parsed = raw?.trim() ? parseLooseAddress(raw) : { street: "", city: null, state: null, zip: null };
  const city = (known.city ?? parsed.city ?? "").trim() || null;
  const state = (known.state ?? parsed.state ?? "").trim() || null;
  const zip = zip5(known.zip ?? parsed.zip) || null;
  const street = stripLocalityFromStreet(parsed.street || raw, { city, state, zip });
  return { street, city, state, zip };
}

export function streetOnlyPremises(
  raw: string | null | undefined,
  known: { city?: string | null; state?: string | null; zip?: string | null } = {},
): string {
  return splitPremisesAddress(raw, known).street;
}

export function formatPremisesDisplay(input: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string | null {
  const parts = splitPremisesAddress(input.address, {
    city: input.city,
    state: input.state,
    zip: input.zip,
  });
  const cityLine = [parts.city, parts.state, parts.zip].filter(Boolean).join(", ");
  const line = [parts.street, cityLine].filter(Boolean).join(", ");
  return line || null;
}

export type PremisesDisplayLines = {
  street: string;
  /** City, ST ZIP — short second line for denser Overview cells. */
  locality: string;
};

/** Street + locality lines for stacked Overview address cells (no long wrap). */
export function formatPremisesLines(input: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): PremisesDisplayLines | null {
  const parts = splitPremisesAddress(input.address, {
    city: input.city,
    state: input.state,
    zip: input.zip,
  });
  const street = parts.street.trim();
  const locality = [parts.city, [parts.state, parts.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  if (!street && !locality) return null;
  return { street, locality };
}

/** Newline-joined street / city-state-zip for whitespace-pre-line display. */
export function formatPremisesStacked(input: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string | null {
  const lines = formatPremisesLines(input);
  if (!lines) return null;
  return [lines.street, lines.locality].filter(Boolean).join("\n");
}

export function premisesLinesEqual(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = splitPremisesAddress(left);
  const b = splitPremisesAddress(right);
  if (!a.street && !b.street && !a.city && !b.city) return false;
  if (cleanPart(a.street) !== cleanPart(b.street)) return false;
  if (a.city && b.city && cleanPart(a.city) !== cleanPart(b.city)) return false;
  if (a.state && b.state && cleanPart(a.state) !== cleanPart(b.state)) return false;
  if (a.zip && b.zip && a.zip !== b.zip) return false;
  return Boolean(a.street || b.street);
}

export function normalizePremises(parts: PremisesParts): string {
  const street = stripLocalityFromStreet(parts.address1, parts);
  return [cleanPart(street), cleanPart(parts.city), cleanPart(parts.state), zip5(parts.zip)]
    .filter(Boolean)
    .join(" | ");
}

export type MatchablePolicy = {
  id: string;
  policyNumber: string;
  status: string;
  premisesKey: string;
};

/**
 * Replacement notices resolve the written policy at the insured premises.
 * A cancelled / non-renewed policy number is never a match key — that number
 * should not exist as the way to find a rewrite.
 */
export function matchReplacementPolicies(
  policies: MatchablePolicy[],
  query: PremisesParts & { policyNumber?: string | null },
): MatchablePolicy[] {
  const key = normalizePremises(query);
  void query.policyNumber;
  if (!key) return [];
  return policies.filter((policy) => isInForceStatus(policy.status) && policy.premisesKey === key);
}

export function resolvePolicyNumberForNotice(
  policies: MatchablePolicy[],
  policyNumber: string | null | undefined,
): { policy: MatchablePolicy | null; ignoredCancelledNumber: string | null } {
  const needle = (policyNumber ?? "").trim();
  if (!needle) return { policy: null, ignoredCancelledNumber: null };
  const hit = policies.find((policy) => policy.policyNumber === needle);
  if (!hit) return { policy: null, ignoredCancelledNumber: null };
  if (isEndedStatus(hit.status)) {
    return { policy: null, ignoredCancelledNumber: hit.policyNumber };
  }
  return { policy: hit, ignoredCancelledNumber: null };
}
