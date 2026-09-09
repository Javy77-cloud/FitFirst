/** Hard bind gate: agent must re-check premium, coverages, and deductibles. */

export type BindGateChecks = {
  premium: boolean;
  coverages: boolean;
  deductibles: boolean;
};

export function bindGateReady(checks: BindGateChecks): boolean {
  return Boolean(checks.premium && checks.coverages && checks.deductibles);
}

export const BIND_GATE_COPY = {
  title: "Re-check this quote before bind",
  subtitle:
    "Re-check means additional or provisional information may still be required, or this quote may be incomplete / unavailable to bind online yet. Confirm premium, coverages, and deductibles against the carrier before you bind.",
  premium: "Premium matches the carrier quote",
  coverages: "Coverages match the carrier quote",
  deductibles: "Deductibles match the carrier quote",
  blocked: "Cannot finalize bind until premium, coverages, and deductibles are confirmed.",
} as const;
