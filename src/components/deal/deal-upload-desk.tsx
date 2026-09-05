import Link from "next/link";
import { HealthStrip } from "@/components/completeness/health-strip";
import { RailOpenActivities, RailPersonCard } from "@/components/record-context/record-context-rail";
import { collectDocHints } from "@/lib/deals/upload-desk";
import type { CompletenessReport } from "@/lib/completeness/report";
import type { ShopLine } from "@/lib/domain";
import type { RecordContextPayload } from "@/lib/record-context-types";

export function DealUploadDesk({
  context,
  health,
  dealId,
  sheetLine,
  sourceDocTypes,
}: {
  context: RecordContextPayload;
  health: CompletenessReport | null;
  dealId: string;
  sheetLine: ShopLine;
  sourceDocTypes: string[];
}) {
  const primary = context.people[0] ?? null;
  const extras = context.people.slice(1);
  const hints = collectDocHints(health, sourceDocTypes);
  const sheetHref = `/deals/${dealId}?tab=quote-sheet&line=${sheetLine}`;

  return (
    <aside className="ff-card overflow-hidden" data-ff-deal-upload-desk>
      <RailPersonCard person={primary} />
      {extras.length > 0 ? (
        <ul className="space-y-2 border-t border-border px-3 py-3">
          {extras.map((person) => (
            <li key={person.key} className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-caption uppercase tracking-wide text-muted-foreground">{person.kindLabel}</div>
                <Link href={person.href} className="text-sm font-medium text-primary hover:underline">
                  {person.label}
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {person.email ? (
                  <a
                    href={`mailto:${person.email}`}
                    className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                  >
                    Send Email
                  </a>
                ) : null}
                {person.phone ? (
                  <a
                    href={`tel:${person.phone}`}
                    className="inline-flex h-8 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-navy"
                  >
                    Call
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="border-t border-border px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-navy">Quote Sheet</h3>
          <Link href={sheetHref} className="text-sm font-medium text-primary hover:underline">
            Open sheet
          </Link>
        </div>
        {health ? (
          <HealthStrip
            report={health}
            title={`${health.confirmed} confirmed / ${health.missing} missing`}
            href={sheetHref}
            dealId={dealId}
            compact
          />
        ) : (
          <p className="text-base text-muted-foreground">No Quote Sheet on this shop yet.</p>
        )}
        {hints.length > 0 ? (
          <div className="mt-3">
            <h4 className="text-sm font-semibold text-navy">Collect next</h4>
            <ul className="mt-1.5 space-y-1">
              {hints.map((hint) => (
                <li key={hint.docType} className="text-sm">
                  <span className="font-medium text-navy">{hint.label}</span>
                  <span className="text-muted-foreground"> — {hint.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : health ? (
          <p className="mt-3 text-base text-muted-foreground">
            Source docs already cover the open sheet slots, or those cells are filled.
          </p>
        ) : null}
      </section>

      <RailOpenActivities items={context.openActivities} newHref={context.newActivityHref} />
    </aside>
  );
}
