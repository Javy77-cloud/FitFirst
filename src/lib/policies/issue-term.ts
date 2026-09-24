/**
 * Policy issued / late DEC writes one term on the matching line only.
 * A Flood DEC never patches an HO3 policy. Fields the DEC does not carry
 * stay as they were. A DEC whose term has already started advances Current.
 */

import { isPendingPolicyNumber } from "@/lib/policy/mint-gate";
import {
  businessDateKey,
  noonUtcFromBusinessDate,
  normalizeNamedInsured,
  resolveCurrentTerm,
  type TermCandidate,
} from "@/lib/policies/current-term";

export type DecTermFacts = {
  effective?: string | null;
  expiration?: string | null;
  premium?: string | null;
  policyNumber?: string | null;
  namedInsured?: string | null;
  lineOfBusiness?: string | null;
};

export type BookPolicyRef = {
  id: string;
  sourceProduct?: string | null;
  lineOfBusiness?: string | null;
  policyNumber?: string | null;
  premium?: string | number | null;
  effectiveDate?: Date | string | null;
  expirationDate?: Date | string | null;
  status?: string | null;
};

export type IssuedTermPlan =
  | {
      ok: true;
      policyId: string;
      role: "current" | "upcoming" | "prior";
      /** Policy-row columns to write. Absent keys stay as they were. */
      policyPatch: {
        effectiveDate?: Date;
        expirationDate?: Date;
        premium?: string;
        policyNumber?: string;
        sourceDocumentId?: string;
      };
      preserved: string[];
      demoteTermIds: string[];
      updateTermId: string | null;
      termEffective: Date;
      termExpiration: Date;
      termPremium: string | null;
      termRole: "current" | "proposed" | "prior";
      documentId: string | null;
      documentRole: "current" | "renewal" | "prior" | null;
      namedInsured: string | null;
    }
  | { ok: false; reason: "wrong_line" | "missing_dates" | "no_policy" | "invalid_dates"; message: string };

/** Family used only to keep HO3 / Flood / Auto / MHO from writing each other. */
export function lineFamily(raw: string | null | undefined): string {
  const compact = (raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
  if (!compact) return "";
  if (compact === "FLOOD" || compact === "NFIP") return "flood";
  if (compact === "AUTO" || compact === "PA" || compact === "PERSONALAUTO") return "auto";
  if (compact === "MHO" || compact === "MH" || compact === "MOBILE" || compact === "MOBILEHOME") return "mho";
  if (compact === "DP3" || compact === "DP1" || compact === "LANDLORD") return "landlord";
  if (compact === "HO" || compact === "HO3" || compact === "HO5" || compact === "HO6" || compact === "HOME" || compact === "HOMEOWNERS") {
    return "home";
  }
  return compact.toLowerCase();
}

function cleanFact(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return text || null;
}

function selectPolicy(
  policies: readonly BookPolicyRef[],
  product: string,
  lineOfBusiness: string,
): BookPolicyRef | null {
  const exact = policies.find((row) => row.sourceProduct === product);
  if (exact) return exact;
  const family = lineFamily(lineOfBusiness);
  const byLine = policies.filter(
    (row) => !row.sourceProduct && lineFamily(row.lineOfBusiness) === family && family !== "",
  );
  return byLine.length === 1 ? byLine[0]! : null;
}

export function planIssuedTermWrite(input: {
  product: string;
  lineOfBusiness: string;
  policies: readonly BookPolicyRef[];
  terms?: readonly (TermCandidate & { policyId?: string | null })[] | null;
  dec: DecTermFacts;
  asOf?: Date;
  documentId?: string | null;
}): IssuedTermPlan {
  const target = selectPolicy(input.policies, input.product, input.lineOfBusiness);
  if (!target) {
    return {
      ok: false,
      reason: "no_policy",
      message: `No ${input.lineOfBusiness} policy for product ${input.product}. Nothing was written.`,
    };
  }
  if (target.sourceProduct && target.sourceProduct !== input.product) {
    return {
      ok: false,
      reason: "wrong_line",
      message: `DEC product ${input.product} does not match policy ${target.id} (${target.sourceProduct}).`,
    };
  }
  const decLine = cleanFact(input.dec.lineOfBusiness);
  if (decLine && lineFamily(decLine) !== lineFamily(target.lineOfBusiness)) {
    return {
      ok: false,
      reason: "wrong_line",
      message: `DEC line ${decLine} cannot write the ${target.lineOfBusiness ?? "other"} policy ${target.id}.`,
    };
  }

  const effectiveKey = businessDateKey(cleanFact(input.dec.effective));
  const expirationKey = businessDateKey(cleanFact(input.dec.expiration));
  if (!effectiveKey || !expirationKey) {
    return {
      ok: false,
      reason: "missing_dates",
      message: "DEC is missing effective or expiration. The current term was left unchanged.",
    };
  }
  const effective = noonUtcFromBusinessDate(effectiveKey);
  const expiration = noonUtcFromBusinessDate(expirationKey);
  if (!effective || !expiration || expiration.getTime() <= effective.getTime()) {
    return {
      ok: false,
      reason: "invalid_dates",
      message: "DEC expiration is not after effective. The current term was left unchanged.",
    };
  }

  const asOf = input.asOf ?? new Date();
  const ownTerms = (input.terms ?? []).filter((term) => !term.policyId || term.policyId === target.id);
  const preview = resolveCurrentTerm(
    {
      status: "active",
      lineOfBusiness: target.lineOfBusiness,
      effectiveDate: effectiveKey,
      expirationDate: expirationKey,
    },
    asOf,
  );
  const role: "current" | "upcoming" | "prior" = preview.current
    ? "current"
    : preview.upcoming
      ? "upcoming"
      : "prior";
  const termRole = role === "current" ? "current" : role === "upcoming" ? "proposed" : "prior";

  const decPremium = cleanFact(input.dec.premium);
  const decNumber = cleanFact(input.dec.policyNumber);
  const policyNumber = decNumber && !isPendingPolicyNumber(decNumber) ? decNumber : null;
  const preserved: string[] = [];
  const policyPatch: Extract<IssuedTermPlan, { ok: true }>["policyPatch"] = {};

  if (role === "current") {
    policyPatch.effectiveDate = effective;
    policyPatch.expirationDate = expiration;
    if (policyNumber) policyPatch.policyNumber = policyNumber;
    else preserved.push("policyNumber");
    if (decPremium) policyPatch.premium = decPremium;
    else preserved.push("premium");
    if (input.documentId) policyPatch.sourceDocumentId = input.documentId;
  } else {
    preserved.push("effectiveDate", "expirationDate", "premium", "policyNumber");
  }

  const same = ownTerms.find((term) => {
    return businessDateKey(term.effective) === effectiveKey && businessDateKey(term.expiration) === expirationKey;
  });
  const demoteTermIds =
    role === "current"
      ? ownTerms
          .filter((term) => term.role === "current" && term.id && term.id !== same?.id)
          .map((term) => term.id!)
      : [];

  const previousCurrent = ownTerms.find((term) => term.role === "current");
  const carriedPremium =
    decPremium ??
    (role === "current"
      ? (premiumText(same?.premium) ?? premiumText(previousCurrent?.premium) ?? premiumText(target.premium))
      : null);

  return {
    ok: true,
    policyId: target.id,
    role,
    policyPatch,
    preserved,
    demoteTermIds,
    updateTermId: same?.id ?? null,
    termEffective: effective,
    termExpiration: expiration,
    termPremium: carriedPremium,
    termRole,
    documentId: input.documentId ?? null,
    documentRole: role === "current" ? "current" : role === "upcoming" ? "renewal" : "prior",
    namedInsured: normalizeNamedInsured(input.dec.namedInsured),
  };
}

function premiumText(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  return text || null;
}
