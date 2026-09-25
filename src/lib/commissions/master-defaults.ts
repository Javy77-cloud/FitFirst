import { healthKind, normalizeSellingAgency } from "./policy-math";
import { policyTypesFor, subTypeFitsLine } from "./zoho-fields";

/**
 * Live Zoho master_commission defaults from the 2026-09-03 Policies packets.
 * Only values that actually appear on live records. Do not invent a rate.
 */
export type MasterSuggestion = {
  commission4: number | null;
  premiumFrequency: string | null;
  insuranceType: string | null;
  policyType: string | null;
  source: string | null;
};

const LIFE_SUBS = new Set([
  "term life",
  "whole life",
  "universal life",
  "indexed universal life (iul)",
  "final expense",
  "accidental death",
]);

const HEALTH_SUBS = new Set([
  "individual health",
  "marketplace",
  "short-term medical",
  "supplemental health",
  "dental",
  "vision",
  "medicare advantage",
  "medicare supplement (medigap)",
  "part d (prescription)",
]);

export function inferInsuranceType(
  policyType?: string | null,
  policySubType?: string | null,
): string | null {
  const type = (policyType ?? "").trim();
  const sub = (policySubType ?? "").trim().toLowerCase();
  if (type === "Life" || LIFE_SUBS.has(sub)) return "Life";
  if (type === "Health" || HEALTH_SUBS.has(sub)) return "Health";
  if (type && type !== "Life" && type !== "Health") return "P&C";
  if (sub) return "P&C";
  return null;
}

export function inferPolicyType(
  insuranceType?: string | null,
  policySubType?: string | null,
): string | null {
  const sub = (policySubType ?? "").trim();
  if (insuranceType === "Life") return "Life";
  if (insuranceType === "Health") return "Health";
  if (sub === "DP3" || sub === "DP1" || sub === "HO4 (Renters)") return "Renter & Landord";
  if (sub === "Auto" || sub === "Motorcycle" || sub === "Rideshare (Uber/Lift)" || sub === "Classic/Collection") {
    return "Auto";
  }
  if (sub === "Commercial Auto") return "Auto";
  if (
    sub === "General Liability" ||
    sub === "Errors & Omissions" ||
    sub === "Workers' Comp" ||
    sub === "Business Owners Policy (BOP)" ||
    sub === "Commercial Property"
  ) {
    return "Commercial";
  }
  if (sub.includes("Flood")) return "Flood";
  if (sub.includes("Umbrella")) return "Umbrella";
  if (sub === "HO3" || sub.startsWith("HO") || sub.includes("HO3")) return "Home";
  if (insuranceType === "P&C") return "Home";
  return null;
}

/** Modal Commission4 from live packets for this selling agency + line. */
export function suggestCommission4(input: {
  sellingAgency?: string | null;
  insuranceType?: string | null;
  policySubType?: string | null;
}): { value: number | null; source: string | null } {
  const agency = normalizeSellingAgency(input.sellingAgency);
  const type =
    input.insuranceType || inferInsuranceType(null, input.policySubType) || "";
  const kind = healthKind(input.policySubType);

  if (type === "Life") {
    return { value: 80, source: "Live Life / BackNine packets: Commission4 80" };
  }
  if (type === "Health") {
    if (kind === "marketplace" || kind === "medicare_advantage") {
      return { value: null, source: "Live Health packets leave Commission4 empty" };
    }
    if (kind === "supplemental") {
      return { value: 25, source: "Live Supplemental / Pimsco/Agility packets: Commission4 25" };
    }
    return { value: null, source: null };
  }
  if (type === "P&C") {
    if (agency === "afa") {
      return { value: 10, source: "Live AFA P&C packets: Commission4 10 (override if the dec is 8 or 18)" };
    }
    if (agency === "first_connect") {
      return { value: 10, source: "Live First Connect P&C packets: Commission4 10" };
    }
    if (agency === "agentero") {
      return { value: 14, source: "Live Agentero GL packet: Commission4 14" };
    }
    return { value: null, source: null };
  }
  return { value: null, source: null };
}

export function suggestPremiumFrequency(input: {
  insuranceType?: string | null;
  policySubType?: string | null;
}): string | null {
  const type = input.insuranceType || inferInsuranceType(null, input.policySubType);
  const kind = healthKind(input.policySubType);
  if (type === "Life") return "Annual";
  if (type === "Health") {
    if (kind === "medicare_advantage") return "Annual";
    if (kind === "marketplace" || kind === "supplemental") return "Monthly";
    return null;
  }
  if (type === "P&C") return "Annual";
  return null;
}

export function coerceLine(input: {
  insuranceType?: string | null;
  policyType?: string | null;
  policySubType?: string | null;
  changed?: "insuranceType" | "policyType" | "policySubType";
}): { insuranceType: string; policyType: string; policySubType: string } {
  let insuranceType = (input.insuranceType ?? "").trim();
  let policyType = (input.policyType ?? "").trim();
  let policySubType = (input.policySubType ?? "").trim();

  if (input.changed === "policySubType" && policySubType) {
    insuranceType = inferInsuranceType(policyType, policySubType) ?? insuranceType;
    policyType = inferPolicyType(insuranceType, policySubType) ?? policyType;
  } else if (input.changed === "insuranceType") {
    const allowed = policyTypesFor(insuranceType);
    if (!allowed.includes(policyType)) {
      policyType = inferPolicyType(insuranceType, policySubType) ?? allowed[0] ?? "";
    }
    if (!subTypeFitsLine(policySubType, insuranceType, policyType)) {
      policySubType = "";
    }
  } else if (input.changed === "policyType") {
    if (!subTypeFitsLine(policySubType, insuranceType, policyType)) {
      policySubType = "";
    }
  }

  return { insuranceType, policyType, policySubType };
}

export function suggestMasterDefaults(input: {
  sellingAgency?: string | null;
  insuranceType?: string | null;
  policyType?: string | null;
  policySubType?: string | null;
  commission4?: number | string | null;
  premiumFrequency?: string | null;
}): MasterSuggestion {
  const insuranceType =
    input.insuranceType || inferInsuranceType(input.policyType, input.policySubType);
  const policyType = input.policyType || inferPolicyType(insuranceType, input.policySubType);
  const rate = suggestCommission4({
    sellingAgency: input.sellingAgency,
    insuranceType,
    policySubType: input.policySubType,
  });
  const frequency =
    input.premiumFrequency ||
    suggestPremiumFrequency({ insuranceType, policySubType: input.policySubType });
  return {
    commission4: rate.value,
    premiumFrequency: frequency,
    insuranceType,
    policyType,
    source: rate.source,
  };
}
