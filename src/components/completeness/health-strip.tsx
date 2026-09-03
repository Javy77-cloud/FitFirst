import Link from "next/link";
import type { CompletenessReport } from "@/lib/completeness/report";
import { cn } from "@/lib/utils";

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

export function HealthStrip({
  report,
  title = "Sheet health",
  href,
  compact = false,
}: {
  report: CompletenessReport;
  title?: string;
  href?: string;
  compact?: boolean;
}) {
  const confirmedW = pct(report.confirmed, report.total);
  const checkW = pct(report.check, report.total);
  const missingW = pct(report.missing, report.total);
  const shopText = report.shopReady
    ? "Shop fields are filled"
    : `${report.shopBlockers.length} blocking shop`;
  const bindText = report.bindReady
    ? "Bind fields are filled"
    : `${report.bindBlockers.length} blocking bind`;
  const heading = href ? (
    <Link href={href} className="text-sm font-semibold text-[var(--ff-terracotta)] hover:underline">
      {title}
    </Link>
  ) : (
    <h3 className="text-sm font-semibold text-[var(--ff-terracotta)]">{title}</h3>
  );

  return (
    <section
      className={cn("ff-completeness", compact && "ff-completeness-compact")}
      data-ff-completeness
      data-confirmed={report.confirmed}
      data-check={report.check}
      data-missing={report.missing}
      data-shop-ready={report.shopReady ? "true" : "false"}
      data-bind-ready={report.bindReady ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {heading}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {report.confirmed} of {report.total} confirmed · yellow missing · blue CHECK. Not a
            bind probability.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-sm bg-fit-green-bg px-2 py-0.5 text-fit-green">
            {report.confirmed} confirmed
          </span>
          <span className="rounded-sm bg-fit-check-bg px-2 py-0.5 text-fit-check">
            {report.check} CHECK
          </span>
          <span className="rounded-sm bg-fit-yellow-bg px-2 py-0.5 text-fit-yellow">
            {report.missing} missing
          </span>
        </div>
      </div>

      <div
        className="ff-completeness-bar"
        role="img"
        aria-label={`${report.confirmed} confirmed, ${report.check} CHECK, ${report.missing} missing`}
      >
        <span className="ff-completeness-confirmed" style={{ width: `${confirmedW}%` }} />
        <span className="ff-completeness-check" style={{ width: `${checkW}%` }} />
        <span className="ff-completeness-missing" style={{ width: `${missingW}%` }} />
      </div>

      <p className="text-xs text-muted-foreground">
        {shopText}
        {" · "}
        {bindText}
      </p>

      {compact ? null : (
        <BlockerList report={report} />
      )}
    </section>
  );
}

function BlockerList({ report }: { report: CompletenessReport }) {
  const rows = report.bindReady
    ? []
    : report.bindBlockers.length > 0
      ? report.bindBlockers
      : report.shopBlockers;
  if (rows.length === 0) {
    return (
      <p className="text-xs text-[var(--ff-green)]">Nothing on this sheet is blocking shop or bind.</p>
    );
  }
  return (
    <ul className="ff-completeness-blockers">
      {rows.slice(0, 8).map((row) => (
        <li key={row.key} data-status={row.status} data-blocks={row.blocks}>
          <span
            className={
              row.status === "check"
                ? "text-fit-check"
                : "text-fit-yellow"
            }
          >
            {row.status === "check" ? "CHECK" : "missing"}
          </span>
          <span className="text-foreground">{row.label}</span>
          <span className="text-muted-foreground">
            {row.blocks === "shop" ? "blocks shop" : "blocks bind"}
          </span>
        </li>
      ))}
    </ul>
  );
}
