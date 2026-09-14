"use client";

import Link from "next/link";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import { PortalLoginBlock } from "@/components/carriers/portal-login-block";
import { CarrierPortalAgentButton } from "@/components/carriers/carrier-portal-agent-button";
import {
  CarrierAmBestFields,
  CarrierContactFields,
  CarrierIdentityFields,
} from "@/components/carriers/carrier-inline-fields";
import { CarrierCommissionTable } from "@/components/carriers/carrier-commission-table";
import { CarrierTimelineSection } from "@/components/carriers/carrier-timeline-section";
import { StructuredAppetiteTable } from "@/components/carriers/structured-appetite-table";
import { StructuredDontWriteTable } from "@/components/carriers/structured-dont-write-table";
import { normalizeCommissionSchedule, type CommissionScheduleRow } from "@/lib/carriers/commission";
import type { AppetiteNoteRow, DontWriteNoteRow } from "@/lib/carriers/appetite-rows";
import type { QuoteHandoffReadiness } from "@/lib/carriers/secrets";
import type { CarrierKpiSnapshot } from "@/lib/carriers/metrics";

type AuditRow = {
  id: string;
  fieldKey: string;
  actorName: string | null;
  createdAt: Date | string;
};

type TimelineRow = {
  id: string;
  kind: string;
  title: string;
  actorName: string | null;
  occurredAt: Date | string;
  reason?: string | null;
};

export function CarrierDetailSections({
  carrierId,
  carrierName,
  admin,
  identity,
  contact,
  appetiteRows,
  dontWriteRows,
  amBest,
  commissionRows,
  newBusinessCommPct,
  renewalCommPct,
  portal,
  related,
  timeline,
  amBestHistory = [],
  kpi,
}: {
  carrierId: string;
  carrierName: string;
  admin: boolean;
  identity: Record<string, string>;
  contact: Record<string, string>;
  appetiteRows: AppetiteNoteRow[];
  dontWriteRows: DontWriteNoteRow[];
  amBest: Record<string, string>;
  commissionRows: CommissionScheduleRow[];
  newBusinessCommPct: string;
  renewalCommPct: string;
  portal: {
    agencyCode?: string | null;
    usernameHint: string | null;
    hasUsername: boolean;
    hasPassword: boolean;
    readiness: QuoteHandoffReadiness;
    audits: AuditRow[];
    portalUrl: string | null;
  };
  related: {
    policyCount: number;
    contactCount: number;
    dealCount: number;
    recentPolicy?: { id: string; label: string } | null;
    recentContact?: { id: string; label: string } | null;
    recentDeal?: { id: string; label: string } | null;
  };
  timeline: TimelineRow[];
  amBestHistory?: { rating: string; outlook: string; date: string }[];
  kpi: CarrierKpiSnapshot;
}) {
  void kpi;
  const schedule = normalizeCommissionSchedule(commissionRows, {
    newBusinessPct: newBusinessCommPct,
    renewalPct: renewalCommPct,
  });

  return (
    <div className="space-y-3" data-ff-carrier-sections="">
      <CollapsibleSection id="identity" title="Identity" defaultOpen>
        <CarrierIdentityFields carrierId={carrierId} values={identity} admin={admin} />
      </CollapsibleSection>

      <CollapsibleSection id="contact" title="Contact" defaultOpen={false}>
        <CarrierContactFields carrierId={carrierId} values={contact} admin={admin} />
      </CollapsibleSection>

      {admin ? (
        <PortalLoginBlock
          carrierId={carrierId}
          agencyCode={portal.agencyCode}
          usernameHint={portal.usernameHint}
          hasUsername={portal.hasUsername}
          hasPassword={portal.hasPassword}
          readiness={portal.readiness}
          audits={portal.audits}
          portalUrl={portal.portalUrl}
          admin={admin}
        />
      ) : (
        <CollapsibleSection id="portal-login-agent" title="Carrier portal" defaultOpen={false}>
          <CarrierPortalAgentButton carrierId={carrierId} />
        </CollapsibleSection>
      )}

      <CollapsibleSection id="appetite" title="Appetite Notes" defaultOpen={false}>
        <StructuredAppetiteTable carrierId={carrierId} rows={appetiteRows} admin={admin} />
      </CollapsibleSection>

      <CollapsibleSection id="dont-write" title="Don't Write" defaultOpen={false}>
        <StructuredDontWriteTable carrierId={carrierId} rows={dontWriteRows} admin={admin} />
      </CollapsibleSection>

      <CollapsibleSection id="commission" title="Commission Schedule" defaultOpen={false}>
        <CarrierCommissionTable carrierId={carrierId} rows={schedule} admin={admin} />
      </CollapsibleSection>

      <CollapsibleSection id="am-best" title="AM Best" defaultOpen={false}>
        <CarrierAmBestFields carrierId={carrierId} values={amBest} admin={admin} />
        <div className="mt-3 border-t border-border/60 pt-3" data-ff-carrier-ambest-history="">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#002868]">
            Rating History
          </p>
          {amBestHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No Rating History Yet. Updates Persist When AM Best Fields Change.
            </p>
          ) : (
            <ol className="space-y-1 text-xs text-muted-foreground">
              {amBestHistory.map((row, i) => (
                <li key={`${row.date}-${i}`}>
                  <span className="font-medium text-[#002868]">{row.rating || "—"}</span>
                  {row.outlook ? ` · ${row.outlook}` : ""}
                  {row.date ? ` · ${row.date}` : ""}
                </li>
              ))}
            </ol>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="related" title="Related" defaultOpen={false}>
        <ul className="space-y-3 text-sm" data-ff-carrier-related-counts="">
          <li className="space-y-0.5">
            <Link
              href={`/policies?carrier=${encodeURIComponent(carrierId)}`}
              className="font-medium text-primary hover:underline"
              data-ff-carrier-related-policies=""
            >
              Policies · {related.policyCount}
            </Link>
            {related.policyCount === 0 ? (
              <div className="text-xs text-muted-foreground">No linked policies yet.</div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Opens Policies filtered to this carrier (all linked records).
              </div>
            )}
          </li>
          <li className="space-y-0.5">
            <Link
              href={`/contacts?q=${encodeURIComponent(carrierName)}`}
              className="font-medium text-primary hover:underline"
            >
              Contacts · {related.contactCount}
            </Link>
            {related.contactCount === 0 ? (
              <div className="text-xs text-muted-foreground">No linked contacts yet.</div>
            ) : null}
          </li>
          <li className="space-y-0.5">
            <Link
              href={`/deals?q=${encodeURIComponent(carrierName)}`}
              className="font-medium text-primary hover:underline"
            >
              Deals · {related.dealCount}
            </Link>
            {related.dealCount === 0 ? (
              <div className="text-xs text-muted-foreground">No linked deals yet.</div>
            ) : null}
          </li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection id="activity" title="Activity & Timeline" defaultOpen={false}>
        <CarrierTimelineSection
          rows={admin ? timeline : timeline.filter((row) => row.kind !== "credential")}
        />
      </CollapsibleSection>
    </div>
  );
}
