import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDay, formatMoney } from "@/lib/domain";
import { sortPolicyTerms, termRoleLabel } from "@/lib/ams/term-history";
import type { PolicyTerm } from "@/lib/db/schema";

export function TermHistoryPanel({
  policyId,
  terms,
}: {
  policyId: string;
  terms: PolicyTerm[];
}) {
  const rows = sortPolicyTerms(terms);
  const hasProposed = rows.some((row) => row.role === "proposed");

  return (
    <section className="ff-card mb-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Policy term history</h2>
        {hasProposed ? (
          <Link
            href={`/policies/${policyId}/compare`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Compare renewal
          </Link>
        ) : null}
      </div>
      <p className="mt-1 text-base text-muted-foreground">
        Prior, current, and proposed terms on this Policy. Compare stays a thin reader — this
        list does not rewrite the Policy.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No prior or current terms on file yet.
        </p>
      ) : (
        <table className="ff-table mt-3">
          <thead>
            <tr>
              <th>Term</th>
              <th>Effective</th>
              <th>Expires</th>
              <th>Premium</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="font-medium">{termRoleLabel(row.role)}</td>
                <td>{formatDay(row.termEffective)}</td>
                <td>{formatDay(row.termExpiration)}</td>
                <td>{formatMoney(row.premium)}</td>
                <td className="text-sm text-muted-foreground">
                  {[row.aopDeductible ? `AOP ${row.aopDeductible}` : null, row.hurricaneDeductible ? `HU ${row.hurricaneDeductible}` : null, row.notes]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
