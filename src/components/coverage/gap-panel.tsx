import Link from "next/link";
import { gapLineLabel, type CoverageGapReport } from "@/lib/coverage/gaps";

export function GapPanel({
  report,
  href,
}: {
  report: CoverageGapReport;
  href?: string;
}) {
  return (
    <section className="ff-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-navy">Coverage gaps</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Rule-based, from in-force policies only. {report.quotesDoNotCount}
        </p>
        {report.inForceCount > 0 ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            In force: {report.inForceLines.map(gapLineLabel).join(", ") || "none"} ·{" "}
            {report.inForceCount} polic{report.inForceCount === 1 ? "y" : "ies"}
          </p>
        ) : null}
      </div>
      {report.findings.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">{report.emptyReason}</p>
      ) : (
        <ul className="divide-y divide-border">
          {report.findings.map((finding) => (
            <li key={finding.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-navy">{finding.title}</p>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Missing {finding.missing.map(gapLineLabel).join(", ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-navy/90">{finding.plainEnglish}</p>
            </li>
          ))}
        </ul>
      )}
      {href ? (
        <div className="border-t border-border px-4 py-2 text-[11px]">
          <Link href={href} className="text-primary hover:underline">
            Open the in-force book
          </Link>
        </div>
      ) : null}
    </section>
  );
}
