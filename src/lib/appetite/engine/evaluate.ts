import type {
  AppetiteColor,
  AppetiteOperator,
  AppetiteSheetSnapshot,
  StandingRuleInput,
} from "./types";
import { asAppetiteColor, worseColor } from "./types";

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coerceString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return null;
}

function thresholdList(threshold: unknown): string[] {
  if (Array.isArray(threshold)) return threshold.map((v) => String(v).toLowerCase());
  if (threshold == null) return [];
  return [String(threshold).toLowerCase()];
}

function readField(
  snap: AppetiteSheetSnapshot,
  field: string,
  asOfYear: number,
): unknown {
  if (field === "roof_year_age") {
    if (snap.roof_year_age != null) return snap.roof_year_age;
    const roofYear = coerceNumber(snap.roof_year);
    if (roofYear != null) return asOfYear - roofYear;
    return null;
  }
  if (field === "mobile_home") {
    if (snap.mobile_home != null) return snap.mobile_home;
    const construction = coerceString(snap.construction)?.toLowerCase() ?? "";
    const occupancy = coerceString(snap.occupancy)?.toLowerCase() ?? "";
    if (
      construction.includes("mobile") ||
      construction.includes("manufactured") ||
      occupancy.includes("mobile")
    ) {
      return true;
    }
    return false;
  }
  if (field === "cov_a_min" || field === "cov_a") {
    return snap.cov_a_min ?? snap.cov_a ?? null;
  }
  return snap[field];
}

export function ruleMatches(
  rule: StandingRuleInput,
  snap: AppetiteSheetSnapshot,
  asOfYear = new Date().getFullYear(),
): boolean {
  const op = rule.operator as AppetiteOperator;
  const raw = readField(snap, rule.field, asOfYear);
  const threshold = rule.threshold;

  if (op === "lte" || op === "gte") {
    const left = coerceNumber(raw);
    const right = coerceNumber(threshold);
    if (left == null || right == null) return false;
    return op === "lte" ? left <= right : left >= right;
  }

  if (op === "eq") {
    if (typeof threshold === "boolean" || typeof raw === "boolean") {
      return Boolean(raw) === Boolean(threshold);
    }
    const left = coerceString(raw)?.toLowerCase();
    const right = coerceString(threshold)?.toLowerCase();
    if (left == null || right == null) return false;
    return left === right;
  }

  if (op === "in" || op === "not_in") {
    const left = coerceString(raw)?.toLowerCase();
    if (left == null) return false;
    const list = thresholdList(threshold);
    const hit = list.some((item) => left.includes(item) || item.includes(left));
    return op === "in" ? hit : !hit;
  }

  return false;
}

export type MatchedRule = {
  ruleId: string;
  color: AppetiteColor;
  reasonCode: string;
};

/** Worst matching Standing rule wins (red > yellow > green). Default green if none fire. */
export function evaluateStandingRules(
  rules: StandingRuleInput[],
  snap: AppetiteSheetSnapshot,
  carrierId: string,
  asOfYear = new Date().getFullYear(),
): MatchedRule {
  let best: MatchedRule = { ruleId: "", color: "green", reasonCode: "" };

  for (const rule of rules) {
    if (rule.stale) continue;
    if (rule.layer && rule.layer !== "standing") continue;
    if (rule.live === false) continue;
    if (rule.carrierId && rule.carrierId !== carrierId) continue;
    if (!ruleMatches(rule, snap, asOfYear)) continue;

    const color = asAppetiteColor(rule.disposition) ?? "yellow";
    const next: MatchedRule = {
      ruleId: rule.id,
      color,
      reasonCode: rule.reasonCode || "other",
    };
    if (!best.ruleId || worseColor(next.color, best.color) === next.color) {
      // Prefer worse color; on tie keep first (more specific earlier seeds).
      if (!best.ruleId || colorRankStrict(next.color) > colorRankStrict(best.color)) {
        best = next;
      }
    }
  }

  return best.ruleId ? best : { ruleId: "", color: "green", reasonCode: "" };
}

function colorRankStrict(color: AppetiteColor): number {
  if (color === "red") return 3;
  if (color === "yellow") return 2;
  return 1;
}

/** Normalize evaluate result for API (null ruleId/reason when default green). */
export function normalizeMatch(match: MatchedRule): {
  color: AppetiteColor;
  ruleId: string | null;
  reasonCode: string | null;
} {
  if (!match.ruleId) {
    return { color: "green", ruleId: null, reasonCode: null };
  }
  return {
    color: match.color,
    ruleId: match.ruleId,
    reasonCode: match.reasonCode || null,
  };
}
