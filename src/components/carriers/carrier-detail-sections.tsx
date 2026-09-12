"use client";

import Link from "next/link";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import { PortalLoginAdmin } from "@/components/carriers/portal-login-admin";
import { CarrierPortalAgentButton } from "@/components/carriers/carrier-portal-agent-button";
import {
  CarrierAmBestFields,
  CarrierContactFields,
  CarrierIdentityFields,
  CarrierRichTextField,
  CarrierPortalUrlField,
} from "@/components/carriers/carrier-inline-fields";
import { CarrierCommissionTable } from "@/components/carriers/carrier-commission-table";
import { CarrierTimelineSection } from "@/components/carriers/carrier-timeline-section";
import { normalizeCommissionSchedule, type CommissionScheduleRow } from "@/lib/carriers/commission";
import type { QuoteHandoffReadiness } from "@/lib/carriers/secrets";

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
  appetiteNotes,
  dontWriteNotes,
  amBest,
  commissionRows,
  newBusinessCommPct,
  renewalCommPct,
  portal,
  related,
  timeline,
  amBestHistoryStub = [],
}: {
  carrierId: string;
  carrierName: string;
  admin: boolean;
  identity: Record<string, string>;
  contact: Record<string, string>;
  appetiteNotes: string;
  dontWriteNotes: string;
  amBest: Record<string, string>;
  commissionRows: CommissionScheduleRow[];
  newBusinessCommPct: string;
  renewalCommPct: string;
  portal: {
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
  amBestHistoryStub?: { rating: string; outlook: string; date: string }[];
}) {
  const schedule = normalizeCommissionSchedule(commissionRows, {
    newBusinessPct: newBusinessCommPct,
    renewalPct: renewalCommPct,
  });

  return (
    <div className="space-y-3" data-ff-carrier-sections="">
      <CollapsibleSection id="identity" title="Identity" defaultOpen>
        <CarrierIdentityFields carrierId={carrierId} values={identity} admin={admin} />
      </CollapsibleSection>

      <CollapsibleSection id="contact" title="Contact" defaultOpen>
        <CarrierContactFields carrierId={carrierId} values={contact} admin={admin} />
      </CollapsibleSection>

      {admin ? (
        <CollapsibleSection
          id="portal-login"
          title="Portal Login"
          badge={
            portal.readiness.ready ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                Ready
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                Missing items
              </span>
            )
          }
          defaultOpen={false}
        >
          <CarrierPortalUrlField
            carrierId={carrierId}
            value={portal.portalUrl ?? ""}
            admin={admin}
          />
          <PortalLoginAdmin
            carrierId={carrierId}
            usernameHint={portal.usernameHint}
            hasUsername={portal.hasUsername}
            hasPassword={portal.hasPassword}
            readiness={portal.readiness}
            audits={portal.audits}
          />
        </CollapsibleSection>
      ) : (
        <CollapsibleSection id="portal-login-agent" title="Carrier portal" defaultOpen={false}>
          <CarrierPortalAgentButton carrierId={carrierId} />
        </CollapsibleSection>
      )}

      <CollapsibleSection id="appetite" title="Appetite Notes" defaultOpen={false}>
        <CarrierRichTextField
          carrierId={carrierId}
          fieldKey="appetite_notes"
          value={appetiteNotes}
          admin={admin}
        />
      </CollapsibleSection>

      <CollapsibleSection id="dont-write" title="Don't Write" defaultOpen={false}>
        <CarrierRichTextField
          carrierId={carrierId}
          fieldKey="dont_write_notes"
          value={dontWriteNotes}
          admin={admin}
        />
      </CollapsibleSection>

      <CollapsibleSection id="commission" title="Commission Schedule" defaultOpen={false}>
        <CarrierCommissionTable carrierId={carrierId} rows={schedule} admin={admin} />
      </CollapsibleSection>

      <CollapsibleSection id="am-best" title="AM Best" defaultOpen={false}>
        <CarrierAmBestFields carrierId={carrierId} values={amBest} admin={admin} />
        <div className="mt-3 border-t border-border/60 pt-3" data-ff-carrier-ambest-history="">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#002868]">
            Rating history
          </p>
          {amBestHistoryStub.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              History timeline stub — next wave will persist rating changes when AM Best fields update.
            </p>
          ) : (
            <ol className="space-y-1 text-xs text-muted-foreground">
              {amBestHistoryStub.map((row, i) => (
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
            >
              Policies · {related.policyCount}
            </Link>
            {related.recentPolicy ? (
              <div className="text-xs text-muted-foreground">
                Latest:{" "}
                <Link href={`/policies/${related.recentPolicy.id}`} className="text-primary hover:underline">
                  {related.recentPolicy.label}
                </Link>
              </div>
            ) : related.policyCount === 0 ? (
              <div className="text-xs text-muted-foreground">No linked policies yet.</div>
            ) : null}
          </li>
          <li className="space-y-0.5">
            <Link
              href={`/contacts?q=${encodeURIComponent(carrierName)}`}
              className="font-medium text-primary hover:underline"
            >
              Contacts · {related.contactCount}
            </Link>
            {related.recentContact ? (
              <div className="text-xs text-muted-foreground">
                Latest:{" "}
                <Link href={`/contacts/${related.recentContact.id}`} className="text-primary hover:underline">
                  {related.recentContact.label}
                </Link>
              </div>
            ) : related.contactCount === 0 ? (
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
            {related.recentDeal ? (
              <div className="text-xs text-muted-foreground">
                Latest:{" "}
                <Link href={`/deals/${related.recentDeal.id}`} className="text-primary hover:underline">
                  {related.recentDeal.label}
                </Link>
              </div>
            ) : related.dealCount === 0 ? (
              <div className="text-xs text-muted-foreground">No linked deals yet.</div>
            ) : null}
          </li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection id="activity" title="Activity & Timeline" defaultOpen={false}>
        <CarrierTimelineSection
          rows={
            admin ? timeline : timeline.filter((row) => row.kind !== "credential")
          }
        />
      </CollapsibleSection>
    </div>
  );
}
