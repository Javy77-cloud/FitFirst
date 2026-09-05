import { isTermRole, termRoleLabel } from "@/lib/domain-ams";

export type TermHistoryRow = {
  id: string;
  role: string;
  termEffective: Date | string;
  termExpiration: Date | string;
  premium: string | null;
  aopDeductible?: string | null;
  hurricaneDeductible?: string | null;
  notes?: string | null;
};

function termRoleRank(role: string): number {
  if (role === "prior") return 0;
  if (role === "current") return 1;
  if (role === "proposed") return 2;
  return 3;
}

function asTime(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function sortPolicyTerms<T extends TermHistoryRow>(terms: T[]): T[] {
  return [...terms].sort((a, b) => {
    const rank = termRoleRank(a.role) - termRoleRank(b.role);
    if (rank !== 0) return rank;
    return asTime(a.termEffective) - asTime(b.termEffective);
  });
}

export function priorTerms<T extends TermHistoryRow>(terms: T[]): T[] {
  return sortPolicyTerms(terms).filter((row) => row.role === "prior");
}

export { isTermRole, termRoleLabel };
