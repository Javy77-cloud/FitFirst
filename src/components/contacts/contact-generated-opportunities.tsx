import { CONTACT_EXTERNAL_COVERAGE_LABEL } from "@/lib/contacts/contact-field-catalog";
import {
  applyInForceCarrierLock,
  declaredCoverageFromFields,
} from "@/lib/coverage/declared-coverage";
import { generateContactOpportunities } from "@/lib/coverage/opportunities";
import type { CoverageLine } from "@/lib/coverage/gaps";
import { cn } from "@/lib/utils";

export function ContactGeneratedOpportunities({
  existingTypes,
  carrierMapRaw,
  inForceLines = [],
  recentLifeEvents = "",
  partyName,
}: {
  existingTypes: string;
  carrierMapRaw: string;
  inForceLines?: CoverageLine[];
  recentLifeEvents?: string;
  partyName?: string;
}) {
  const declared = applyInForceCarrierLock(
    declaredCoverageFromFields({
      existingCoverageTypes: existingTypes,
      carrierOfRecord: carrierMapRaw,
    }),
    inForceLines,
  );
  const rows = generateContactOpportunities({
    inForceLines,
    declaredCoverage: declared,
    recentLifeEvents,
    partyName,
  });

  return (
    <div className="min-w-0 space-y-1.5" data-ff-generated-opportunities="">
      <p className="text-[11px] text-muted-foreground">
        Generated from policies in force with us, {CONTACT_EXTERNAL_COVERAGE_LABEL.toLowerCase()},
        and recent life events. Agents do not type these.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-ff-generated-opportunities-empty="">
          No open household gaps on the lines this desk checks.
        </p>
      ) : (
        <ul
          className="overflow-hidden rounded-md border border-border"
          data-ff-generated-opportunities-list=""
        >
          {rows.map((row) => (
            <li
              key={row.line}
              className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-stretch border-b border-border last:border-b-0"
              data-ff-generated-opportunity={row.line}
              data-ff-generated-opportunity-reason={row.reason}
            >
              <div className="flex items-center border-r border-border bg-[var(--ff-wash)] px-2 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  {row.label}
                </span>
              </div>
              <div className={cn("px-2 py-1.5 text-[11px] leading-snug text-muted-foreground")}>
                {row.reason === "life_event" ? row.detail : `Household is not covered for ${row.label.toLowerCase()}.`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
