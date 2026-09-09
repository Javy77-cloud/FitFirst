import { evaluateStandingRules, normalizeMatch } from "./evaluate";
import type {
  CarrierAppetitePrediction,
  PredictAppetiteInput,
} from "./types";

/**
 * Silent Standing-only predictor (shadow mode).
 * Do NOT wire into Markets agent UI yet — call from server helpers only.
 *
 * Contract notes:
 * - Candidates never drive colors (filtered in evaluateStandingRules).
 * - Default color is green when no Standing rule fires.
 * - Floor-only / forced Cov A is handled on resolve (never green) — see resolveActualColor.
 */
export function predictAppetite(
  input: PredictAppetiteInput,
): CarrierAppetitePrediction[] {
  const asOfYear = input.asOfYear ?? new Date().getFullYear();
  const standing = input.rules.filter(
    (r) => (!r.layer || r.layer === "standing") && r.live !== false && !r.stale,
  );

  return input.carriers.map((carrierId) => {
    const match = normalizeMatch(
      evaluateStandingRules(standing, input.sheetSnapshot, carrierId, asOfYear),
    );
    return {
      carrierId,
      color: match.color,
      ruleId: match.ruleId,
      reasonCode: match.reasonCode,
    };
  });
}
