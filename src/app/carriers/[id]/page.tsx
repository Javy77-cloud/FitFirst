import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { QuickCommsBoard } from "@/components/comms/quick-comms-board";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { CarrierDetailWorkspace } from "@/components/carriers/carrier-detail-workspace";
import { CarrierDetailSections } from "@/components/carriers/carrier-detail-sections";
import { CarrierOverflowMenu } from "@/components/carriers/carrier-overflow-menu";
import { CarrierKpiStrip } from "@/components/carriers/carrier-kpi-strip";
import {
  CarrierStatusDot,
  carrierDeskStatusFromFlags,
} from "@/components/carriers/carrier-status-dot";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { listCarrierSecretAudits } from "@/app/actions/carrier-secrets";
import { currentDeskSession } from "@/lib/auth/session";
import { quoteHandoffReadiness } from "@/lib/carriers/secrets";
import { normalizeCommissionSchedule } from "@/lib/carriers/commission";
import {
  normalizeAppetiteRows,
  normalizeDontWriteRows,
} from "@/lib/carriers/appetite-rows";
import { emptyCarrierKpi } from "@/lib/carriers/metrics";
import { getCarrierWorkspace } from "@/lib/db/queries";
import { loadRecordContext } from "@/lib/record-context";
import { isUuid } from "@/lib/ids";
import { formatDisplayDate } from "@/lib/dates/display-format";

export const dynamic = "force-dynamic";

export default async function CarrierRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "logs") redirect("/settings/developer/appetite-log");
  if (id === "compare") redirect("/carriers/compare");
  if (id === "calculator") redirect("/carriers/calculator");

  if (!isUuid(id)) notFound();

  const [workspace, session, tagExtra] = await Promise.all([
    getCarrierWorkspace(id),
    currentDeskSession(),
    listModuleTags("carriers").catch(() => [] as { name: string; color: string | null }[]),
  ]);
  if (!workspace) notFound();

  const {
    carrier,
    timeline,
    amBestHistory,
    activePolicyCount,
    policyCount,
    dealCount,
    contactCount,
    recentPolicy,
    recentContact,
    recentDeal,
    kpi = emptyCarrierKpi(),
  } = workspace as typeof workspace & { kpi?: ReturnType<typeof emptyCarrierKpi> };
  const deskStatus = carrierDeskStatusFromFlags({
    active: carrier.active,
    deskStatus: (carrier as { deskStatus?: string | null }).deskStatus,
  });
  const statusLabel =
    deskStatus === "pending" ? "Pending" : deskStatus === "inactive" ? "Inactive" : "Active";
  const admin = session.isAdmin;
  const audits = admin ? await listCarrierSecretAudits(id) : [];
  const readiness = quoteHandoffReadiness({
    portalUrl: carrier.portalUrl,
    agencyCode: carrier.agencyCode,
    hasPortalUsername: carrier.hasPortalUsername,
    hasPortalPassword: carrier.hasPortalPassword,
  });

  const context = await loadRecordContext({});
  const phone =
    carrier.phone ?? carrier.underwriterPhone ?? carrier.agentPhone ?? carrier.customerServicePhone;
  const email = carrier.email ?? carrier.underwriterEmail ?? carrier.accountManagerEmail;

  const identity = {
    name: carrier.name ?? "",
    agency_code: carrier.agencyCode ?? "",
    website: carrier.website ?? "",
    phone: carrier.phone || carrier.customerServicePhone || carrier.agentPhone || "",
    email: carrier.email || carrier.underwriterEmail || "",
    mailing_address: carrier.mailingAddress ?? "",
    written_lines: (carrier.writtenLines ?? []).join(", "),
    status: statusLabel,
  };

  const contact = {
    underwriter_name: carrier.underwriterName ?? "",
    underwriter_phone: carrier.underwriterPhone ?? "",
    underwriter_email: carrier.underwriterEmail ?? "",
    claims_contact_name: carrier.claimsContactName ?? "",
    claims_phone: carrier.claimsPhone ?? "",
    claims_contact_email: carrier.claimsContactEmail ?? "",
    marketing_contact_name: carrier.marketingContactName ?? "",
    marketing_contact_phone: carrier.marketingContactPhone ?? "",
    marketing_contact_email: carrier.marketingContactEmail ?? "",
  };

  const amBestDate =
    carrier.amBestDate != null
      ? new Date(carrier.amBestDate).toISOString().slice(0, 10)
      : "";

  const amBest = {
    am_best_rating: carrier.amBestRating ?? "",
    am_best_outlook: carrier.amBestOutlook ?? "",
    am_best_date: amBestDate,
  };

  const schedule = normalizeCommissionSchedule(carrier.commissionSchedule, {
    newBusinessPct: carrier.newBusinessCommPct,
    renewalPct: carrier.renewalCommPct,
  });

  const appetiteRows = normalizeAppetiteRows(
    (carrier as { appetiteRows?: unknown }).appetiteRows,
  );
  const dontWriteRows = normalizeDontWriteRows(
    (carrier as { dontWriteRows?: unknown }).dontWriteRows,
  );

  const autoLabelParts = [
    carrier.name,
    carrier.agencyCode?.trim() || null,
    (carrier.writtenLines ?? []).slice(0, 2).join(", ") || null,
  ].filter(Boolean);
  const displayLabel = autoLabelParts.join(" / ");

  return (
    <AppShell title="Carriers">
      <div className="mb-3 space-y-1" data-ff-carrier-header-bar="">
        <div className="flex flex-wrap items-start gap-2">
          <div className="mt-2 shrink-0">
            <CarrierStatusDot status={deskStatus} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h2 className="text-xl font-semibold text-[#002868]">{displayLabel}</h2>
              <div className="flex min-w-0 flex-wrap items-center gap-2 pl-1">
                <span
                  className={
                    deskStatus === "active"
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                      : deskStatus === "pending"
                        ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                        : "rounded-full bg-[#FCE8EC] px-2 py-0.5 text-xs font-medium text-[#BF0A30]"
                  }
                >
                  {statusLabel}
                </span>
                {(carrier.writtenLines ?? []).slice(0, 4).map((line) => (
                  <span
                    key={line}
                    className="rounded-full border border-[#002868]/40 bg-[#002868]/5 px-2 py-0.5 text-xs font-medium text-[#002868]"
                  >
                    {line}
                  </span>
                ))}
              </div>
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                <Link
                  href={`/carriers/calculator?carrier=${carrier.id}`}
                  className="inline-flex h-8 items-center rounded-md border border-[#002868]/30 bg-[#002868]/5 px-2.5 text-sm font-medium text-[#002868] hover:bg-[#002868]/10"
                  data-ff-carrier-header-calculator=""
                >
                  Commission Calculator
                </Link>
                <Link
                  href={`/carriers/compare?lob=${encodeURIComponent((carrier.writtenLines ?? [])[0] ?? "HO")}`}
                  className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
                  data-ff-carrier-header-compare=""
                >
                  Market Comparison
                </Link>
                <EditLayoutLink module="carriers" />
                <CarrierOverflowMenu
                  carrierId={carrier.id}
                  carrierName={carrier.name}
                  admin={admin}
                  tags={carrier.tags}
                  tagExtra={tagExtra}
                />
              </div>
            </div>
            <div className="max-w-xl" data-ff-carrier-header-tags="">
              <AssignRecordTags
                module="carriers"
                recordId={carrier.id}
                tags={carrier.tags}
                catalog={tagExtra.map((row) => ({ name: row.name, color: row.color }))}
                appearance="addLink"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Active Policies {activePolicyCount}
              {policyCount !== activePolicyCount ? ` · ${policyCount} Total` : ""}
              {" · "}
              Last Contacted{" "}
              {carrier.lastContactedAt
                ? formatDisplayDate(carrier.lastContactedAt)
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <CarrierKpiStrip kpi={kpi} />

      <CarrierDetailWorkspace
        rail={
          <>
            <div className="min-w-0 w-full max-w-full" data-ff-carrier-quick-comms="">
              <QuickCommsBoard
                items={[]}
                carrierId={carrier.id}
                contactName={carrier.underwriterName ?? carrier.name}
                contactPhone={phone}
                contactEmail={email}
              />
            </div>
            <RecordContextRail context={context} defaultTab="info" headingName={carrier.name} />
          </>
        }
      >
        <CarrierDetailSections
          carrierId={carrier.id}
          carrierName={carrier.name}
          admin={admin}
          identity={identity}
          contact={contact}
          appetiteRows={appetiteRows}
          dontWriteRows={dontWriteRows}
          amBest={amBest}
          commissionRows={schedule}
          newBusinessCommPct={carrier.newBusinessCommPct ?? ""}
          renewalCommPct={carrier.renewalCommPct ?? ""}
          portal={{
            agencyCode: carrier.agencyCode,
            usernameHint: carrier.portalUsernameHint,
            hasUsername: carrier.hasPortalUsername,
            hasPassword: carrier.hasPortalPassword,
            readiness,
            audits,
            portalUrl: carrier.portalUrl,
          }}
          related={{
            policyCount,
            contactCount,
            dealCount,
            recentPolicy,
            recentContact,
            recentDeal,
          }}
          timeline={timeline}
          amBestHistory={
            amBestHistory.length > 0
              ? amBestHistory
              : amBest.am_best_rating
                ? [
                    {
                      rating: amBest.am_best_rating,
                      outlook: amBest.am_best_outlook,
                      date: amBest.am_best_date,
                    },
                  ]
                : []
          }
          kpi={kpi}
        />
      </CarrierDetailWorkspace>
    </AppShell>
  );
}
