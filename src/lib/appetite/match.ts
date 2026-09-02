import {
  currentRoofAge,
  type AppetiteRuleInput,
  type FitBand,
  type PriorAttempt,
  type RiskSnapshot,
} from "@/lib/domain";

export type MatchReason = {
  code: string;
  message: string;
  severity: "pass" | "stretch" | "fail";
};

export type CarrierMatch = {
  carrierId: string;
  carrierName: string;
  band: FitBand;
  fitScore: number;
  reasons: MatchReason[];
  learnedDecline: boolean;
  shoppable: boolean;
};

function similarSnapshot(log: PriorAttempt, risk: RiskSnapshot): boolean {
  const yearOk =
    log.snapYearBuilt == null ||
    risk.yearBuilt == null ||
    Math.abs(log.snapYearBuilt - risk.yearBuilt) <= 1;
  const roofOk =
    log.snapRoofYear == null ||
    risk.roofYear == null ||
    Math.abs(log.snapRoofYear - risk.roofYear) <= 1;
  const coveringOk =
    !log.snapRoofCovering ||
    !risk.roofCovering ||
    risk.roofCovering.toLowerCase().includes(log.snapRoofCovering.toLowerCase()) ||
    log.snapRoofCovering.toLowerCase().includes(risk.roofCovering.toLowerCase());
  const constOk =
    !log.snapConstruction ||
    !risk.construction ||
    log.snapConstruction.toLowerCase() === risk.construction.toLowerCase();
  const countyOk =
    !log.snapCounty ||
    !risk.county ||
    log.snapCounty.toLowerCase() === risk.county.toLowerCase();
  return yearOk && roofOk && coveringOk && constOk && countyOk;
}

function inList(value: string | null, allowed: string[] | null): boolean {
  if (!allowed || allowed.length === 0 || !value) return true;
  const v = value.toLowerCase();
  return allowed.some((a) => v.includes(a.toLowerCase()) || a.toLowerCase().includes(v));
}

function roofCoveringAllowed(value: string, allowed: string[]): boolean {
  const parts = value
    .split(/[+/,]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return inList(value, allowed);
  return parts.every((part) =>
    allowed.some((a) => part.includes(a.toLowerCase()) || a.toLowerCase().includes(part)),
  );
}

export function matchCarrier(
  risk: RiskSnapshot,
  rule: AppetiteRuleInput,
  prior: PriorAttempt[],
  asOfYear = new Date().getFullYear(),
): CarrierMatch {
  const reasons: MatchReason[] = [];
  let fitScore = 100;

  const learned = prior.find(
    (p) =>
      p.carrierId === rule.carrierId &&
      !p.bindable &&
      similarSnapshot(p, risk),
  );
  if (learned) {
    reasons.push({
      code: "learned_decline",
      message: `Prior ${learned.result.replaceAll("_", " ")}: ${learned.why ?? "see log"}`,
      severity: "fail",
    });
    fitScore -= 40;
  }

  if (rule.portalStatus === "closed") {
    reasons.push({
      code: "portal_closed",
      message: "Portal closed — do not submit",
      severity: "fail",
    });
    fitScore -= 50;
  } else if (rule.portalStatus === "takeout_only") {
    reasons.push({
      code: "takeout_only",
      message: "Takeout / residual only",
      severity: "stretch",
    });
    fitScore -= 20;
  } else {
    reasons.push({
      code: "portal_open",
      message: "Portal open",
      severity: "pass",
    });
  }

  if (rule.writtenLines.length > 0 && !rule.writtenLines.includes("HO")) {
    reasons.push({
      code: "line_not_written",
      message: "Homeowners not a written line",
      severity: "fail",
    });
  }

  if (risk.coverageA != null && rule.minCovA != null) {
    if (risk.coverageA < rule.minCovA) {
      const stretch = risk.coverageA >= rule.minCovA * 0.9;
      reasons.push({
        code: "min_cov_a",
        message: `Cov A ${risk.coverageA} below min ${rule.minCovA}`,
        severity: stretch ? "stretch" : "fail",
      });
      fitScore -= stretch ? 12 : 25;
    } else {
      reasons.push({
        code: "min_cov_a",
        message: "Cov A meets minimum",
        severity: "pass",
      });
    }
  }

  if (risk.coverageA != null && rule.maxCovA != null && risk.coverageA > rule.maxCovA) {
    reasons.push({
      code: "max_cov_a",
      message: `Cov A above max ${rule.maxCovA}`,
      severity: "fail",
    });
    fitScore -= 25;
  }

  if (risk.county && rule.countyMinCovA?.[risk.county] != null && risk.coverageA != null) {
    const floor = rule.countyMinCovA[risk.county];
    if (risk.coverageA < floor) {
      reasons.push({
        code: "county_min_cov_a",
        message: `${risk.county} minimum Cov A is ${floor}`,
        severity: "fail",
      });
      fitScore -= 22;
    }
  }

  if (risk.yearBuilt != null && rule.minYearBuilt != null && risk.yearBuilt < rule.minYearBuilt) {
    const stretch = risk.yearBuilt >= rule.minYearBuilt - 5;
    reasons.push({
      code: "year_built",
      message: `Year built ${risk.yearBuilt} vs min ${rule.minYearBuilt}`,
      severity: stretch ? "stretch" : "fail",
    });
    fitScore -= stretch ? 10 : 20;
  }

  const roofAge = currentRoofAge(risk.roofYear, asOfYear);
  if (roofAge != null && rule.maxRoofAge != null && roofAge > rule.maxRoofAge) {
    const stretch = roofAge <= rule.maxRoofAge + 5;
    reasons.push({
      code: "roof_age",
      message: `Roof age ${roofAge}y exceeds max ${rule.maxRoofAge}y`,
      severity: stretch ? "stretch" : "fail",
    });
    fitScore -= stretch ? 12 : 24;
  }

  if (risk.roofCovering && rule.allowedRoofCoverings) {
    if (!roofCoveringAllowed(risk.roofCovering, rule.allowedRoofCoverings)) {
      reasons.push({
        code: "roof_covering",
        message: `${risk.roofCovering} not in appetite`,
        severity: "fail",
      });
      fitScore -= 22;
    }
  }

  if (risk.construction && rule.allowedConstruction) {
    if (!inList(risk.construction, rule.allowedConstruction)) {
      reasons.push({
        code: "construction",
        message: `${risk.construction} not written`,
        severity: "fail",
      });
      fitScore -= 22;
    }
  }

  if (risk.occupancy && rule.allowedOccupancy) {
    if (!inList(risk.occupancy, rule.allowedOccupancy)) {
      reasons.push({
        code: "occupancy",
        message: `${risk.occupancy} occupancy not written`,
        severity: "fail",
      });
      fitScore -= 18;
    }
  }

  if (risk.county && rule.excludedCounties?.some((c) => c.toLowerCase() === risk.county!.toLowerCase())) {
    reasons.push({
      code: "excluded_county",
      message: `${risk.county} is excluded`,
      severity: "fail",
    });
    fitScore -= 30;
  }

  if (risk.county && rule.allowedCounties && rule.allowedCounties.length > 0) {
    if (!rule.allowedCounties.some((c) => c.toLowerCase() === risk.county!.toLowerCase())) {
      reasons.push({
        code: "county_not_allowed",
        message: `${risk.county} not on the write list`,
        severity: "fail",
      });
      fitScore -= 24;
    }
  }

  if (risk.mobileHome && !rule.mobileAllowed) {
    reasons.push({
      code: "mobile",
      message: "Mobile / manufactured not written",
      severity: "fail",
    });
    fitScore -= 30;
  }

  if (rule.requiresOpeningProtection && risk.openingProtection === "none") {
    reasons.push({
      code: "openings",
      message: "Opening protection required",
      severity: "fail",
    });
    fitScore -= 20;
  }

  if (risk.stories != null && rule.maxStories != null && risk.stories > rule.maxStories) {
    reasons.push({
      code: "stories",
      message: `Stories ${risk.stories} over max ${rule.maxStories}`,
      severity: "fail",
    });
    fitScore -= 16;
  }

  if (risk.milesToCoast != null) {
    if (!rule.coastalAllowed && risk.milesToCoast <= 20) {
      reasons.push({
        code: "coastal",
        message: "Coastal risks not written",
        severity: "fail",
      });
      fitScore -= 28;
    }
    if (rule.minMilesToCoast != null && risk.milesToCoast < rule.minMilesToCoast) {
      reasons.push({
        code: "min_miles_coast",
        message: `${risk.milesToCoast} mi to coast; needs ${rule.minMilesToCoast}+ mi`,
        severity: "fail",
      });
      fitScore -= 28;
    }
    if (rule.maxMilesToCoast != null && risk.milesToCoast > rule.maxMilesToCoast) {
      reasons.push({
        code: "max_miles_coast",
        message: "Outside coastal program miles",
        severity: "stretch",
      });
      fitScore -= 8;
    }
  }

  if (rule.requireReplacementCost && (risk.replacementCostEstimate == null || risk.replacementCostEstimate <= 0)) {
    reasons.push({
      code: "rce_required",
      message: "RCE / MSB required — floor-only without it",
      severity: "stretch",
    });
    fitScore -= 18;
  } else if (
    rule.rceFloorRatio &&
    risk.replacementCostEstimate &&
    risk.coverageA &&
    risk.coverageA < risk.replacementCostEstimate * rule.rceFloorRatio
  ) {
    reasons.push({
      code: "rce_floor",
      message: "Cov A below carrier RCE/MSB floor",
      severity: "stretch",
    });
    fitScore -= 16;
  }

  if (rule.dontWriteNotes) {
    reasons.push({
      code: "dont_write",
      message: rule.dontWriteNotes,
      severity: "pass",
    });
  }

  const hasFail = reasons.some((r) => r.severity === "fail");
  const hasStretch = reasons.some((r) => r.severity === "stretch");
  const band: FitBand = hasFail ? "red" : hasStretch ? "yellow" : "green";
  if (band === "green") fitScore = Math.max(fitScore, 70);
  if (band === "yellow") fitScore = Math.min(fitScore, 69);
  if (band === "red") fitScore = Math.min(fitScore, 39);

  return {
    carrierId: rule.carrierId,
    carrierName: rule.carrierName,
    band,
    fitScore,
    reasons,
    learnedDecline: Boolean(learned),
    shoppable: band !== "red",
  };
}

export function rankFits(matches: CarrierMatch[]): CarrierMatch[] {
  const order: Record<FitBand, number> = { green: 0, yellow: 1, red: 2 };
  return [...matches].sort((a, b) => {
    if (order[a.band] !== order[b.band]) return order[a.band] - order[b.band];
    return b.fitScore - a.fitScore;
  });
}

export function riskFromRecord(risk: {
  yearBuilt: number | null;
  roofYear: number | null;
  roofCovering: string | null;
  construction: string | null;
  openingProtection: string | null;
  occupancy: string | null;
  stories: number | null;
  pool: boolean | null;
  protectionClass: string | null;
  milesToCoast: number | null;
  city: string | null;
  county: string | null;
  coverageA: number | null;
  mobileHome: boolean | null;
  replacementCostEstimate: number | null;
  state: string | null;
}): RiskSnapshot {
  return { ...risk };
}
