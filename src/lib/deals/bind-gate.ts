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
  premium: "Premium matches the carrier quote",
  coverages: "Coverages match the carrier quote",
  deductibles: "Deductibles match the carrier quote",
  blocked: "Cannot finalize bind until premium, coverages, and deductibles are confirmed.",
} as const;
