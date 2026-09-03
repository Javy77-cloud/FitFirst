import { toNumber } from "./math";

export type PolicyCommissionInput = {
  insuranceType?: string | null;
  policyType?: string | null;
  policySubType?: string | null;
  sellingAgency?: string | null;
  gwp?: number | string | null;
  commission4?: number | string | null;
  premiumFrequency?: string | null;
  numberOfInsured?: number | string | null;
};

export type PolicyCommissionRule =
  | "life"
  | "pc"
  | "marketplace"
  | "medicare_advantage"
  | "supplemental"
  | "health_other"
  | "none";

export type PolicyCommissionResult = {
  totalAnnualCommission: number;
  initialCommission: number;
  deferredCommission: number;
  monthlyCommission: number;
  /** P&C rate actually applied after the AFA half. Null when Commission4 is unused. */
  effectiveRatePct: number | null;
  rule: PolicyCommissionRule;
  caption: string;
};

export type PolicyCommissionVisibility = {
  showCommission4: boolean;
  showNumberOfInsured: boolean;
  showLifeSplit: boolean;
  showMonthly: boolean;
  gwpLabel: string;
  gwpHint: string;
};

const ZERO: Omit<PolicyCommissionResult, "rule" | "caption" | "effectiveRatePct"> = {
  totalAnnualCommission: 0,
  initialCommission: 0,
  deferredCommission: 0,
  monthlyCommission: 0,
};

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function nullableNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

export function normalizeSellingAgency(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  const compact = raw.replace(/[\s-]+/g, "_").replace(/\//g, "_");
  if (raw === "afa" || compact === "afa") return "afa";
  if (compact === "first_connect" || compact === "firstconnect") return "first_connect";
  if (compact === "agentero") return "agentero";
  if (
    compact === "agility" ||
    compact === "pimsco_agility" ||
    compact === "pimsco" ||
    raw === "pimsco/agility"
  ) {
    return "pimsco_agility";
  }
  if (compact === "backnine" || compact === "back_nine") return "backnine";
  return compact;
}

export function isAfaSellingAgency(value: string | null | undefined): boolean {
  return normalizeSellingAgency(value) === "afa";
}

export function healthKind(
  policySubType: string | null | undefined,
): "marketplace" | "medicare_advantage" | "supplemental" | "other" {
  const sub = (policySubType ?? "").trim().toLowerCase();
  if (sub === "marketplace") return "marketplace";
  if (sub === "medicare advantage") return "medicare_advantage";
  if (sub === "supplemental health" || sub === "supplemental") return "supplemental";
  return "other";
}

/** AFA applies half of Commission4. First Connect / Agentero / others use the full %. */
export function effectivePcRatePct(
  commission4: number | null,
  sellingAgency: string | null | undefined,
): number {
  const c4 = commission4 ?? 0;
  return isAfaSellingAgency(sellingAgency) ? c4 / 2 : c4;
}

export function policyCommissionVisibility(
  input: Pick<PolicyCommissionInput, "insuranceType" | "policySubType">,
): PolicyCommissionVisibility {
  const type = (input.insuranceType ?? "").trim();
  const kind = healthKind(input.policySubType);
  const life = type === "Life";
  const pc = type === "P&C";
  const health = type === "Health";
  const marketplace = health && kind === "marketplace";
  const medicare = health && kind === "medicare_advantage";
  const supplemental = health && kind === "supplemental";

  return {
    showCommission4: life || pc || supplemental || (health && kind === "other"),
    showNumberOfInsured: marketplace,
    showLifeSplit: life,
    showMonthly: pc || marketplace || supplemental || (health && kind === "other"),
    gwpLabel: marketplace
      ? "PMPM ($)"
      : medicare
        ? "Gross written premium ($)"
        : supplemental
          ? "Monthly premium ($)"
          : "Gross written premium ($)",
    gwpHint: marketplace
      ? "Marketplace GWP is per-member-per-month dollars, not annual premium."
      : medicare
        ? "Medicare Advantage GWP is the one-time commission dollars."
        : supplemental
          ? "Supplemental GWP is the monthly premium the Commission4 % applies to."
          : life
            ? "Life TAC is GWP × Commission4%. Initial is 9/12 of TAC; deferred is 3/12."
            : pc
              ? "P&C TAC is GWP × Commission4% (AFA uses half of Commission4). Monthly is TAC/12 only when frequency is Monthly."
              : "Copied from the live Zoho Policies layout.",
  };
}

export function computePolicyCommission(input: PolicyCommissionInput): PolicyCommissionResult {
  const type = (input.insuranceType ?? "").trim();
  const gwp = toNumber(input.gwp);
  const commission4 = nullableNumber(input.commission4);
  const frequency = (input.premiumFrequency ?? "").trim();
  const insured = Math.max(0, Math.trunc(toNumber(input.numberOfInsured)));

  if (type === "Life") {
    const tac = gwp * ((commission4 ?? 0) / 100);
    return {
      totalAnnualCommission: roundMoney(tac),
      initialCommission: roundMoney(tac * (9 / 12)),
      deferredCommission: roundMoney(tac * (3 / 12)),
      monthlyCommission: 0,
      effectiveRatePct: commission4,
      rule: "life",
      caption:
        "Life: TAC = GWP × Commission4%. Initial = TAC × 9/12. Deferred = TAC × 3/12. Monthly = 0.",
    };
  }

  if (type === "Health") {
    const kind = healthKind(input.policySubType);
    if (kind === "marketplace") {
      const monthly = insured * gwp;
      return {
        totalAnnualCommission: roundMoney(monthly * 12),
        initialCommission: 0,
        deferredCommission: 0,
        monthlyCommission: roundMoney(monthly),
        effectiveRatePct: null,
        rule: "marketplace",
        caption:
          "Marketplace: GWP is PMPM $. Monthly = Number of Insured × GWP. TAC = monthly × 12. Commission4 is unused.",
      };
    }
    if (kind === "medicare_advantage") {
      return {
        totalAnnualCommission: roundMoney(gwp),
        initialCommission: 0,
        deferredCommission: 0,
        monthlyCommission: 0,
        effectiveRatePct: null,
        rule: "medicare_advantage",
        caption:
          "Medicare Advantage: one-time TAC = GWP. Monthly = 0. Commission4 is unused.",
      };
    }
    if (kind === "supplemental") {
      const monthly = gwp * ((commission4 ?? 0) / 100);
      return {
        totalAnnualCommission: roundMoney(monthly * 12),
        initialCommission: 0,
        deferredCommission: 0,
        monthlyCommission: roundMoney(monthly),
        effectiveRatePct: commission4,
        rule: "supplemental",
        caption: "Supplemental: Monthly = GWP × Commission4%. TAC = monthly × 12.",
      };
    }
    if (commission4 != null) {
      const monthly = gwp * (commission4 / 100);
      return {
        totalAnnualCommission: roundMoney(monthly * 12),
        initialCommission: 0,
        deferredCommission: 0,
        monthlyCommission: roundMoney(monthly),
        effectiveRatePct: commission4,
        rule: "health_other",
        caption:
          "Other Health subtype: Commission4 is present, so monthly = GWP × % (same as Supplemental). No invented rate.",
      };
    }
    return {
      ...ZERO,
      effectiveRatePct: null,
      rule: "health_other",
      caption:
        "Other Health subtype has no live Commission4 and no specified formula — amounts stay 0.",
    };
  }

  if (type === "P&C") {
    const rate = effectivePcRatePct(commission4, input.sellingAgency);
    const tac = gwp * (rate / 100);
    const monthly = frequency === "Monthly" ? tac / 12 : 0;
    return {
      totalAnnualCommission: roundMoney(tac),
      initialCommission: 0,
      deferredCommission: 0,
      monthlyCommission: roundMoney(monthly),
      effectiveRatePct: rate,
      rule: "pc",
      caption: isAfaSellingAgency(input.sellingAgency)
        ? "P&C AFA: TAC = GWP × (Commission4 ÷ 2)%. Initial/Deferred = 0. Monthly = TAC/12 only when frequency is Monthly."
        : "P&C: TAC = GWP × Commission4%. Initial/Deferred = 0. Monthly = TAC/12 only when frequency is Monthly.",
    };
  }

  return {
    ...ZERO,
    effectiveRatePct: null,
    rule: "none",
    caption: "Set Insurance Type to Life, Health, or P&C to calculate from the live Zoho rules.",
  };
}
