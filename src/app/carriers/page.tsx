import { AppShell } from "@/components/app-shell";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { formatMoney } from "@/lib/domain";
import { listCarriersDesk } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { CARRIERS_LIST_COLUMNS } from "@/lib/list-columns";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { LINES } from "@/lib/domain";
import { firstParam, matchesField, pickFilterParams } from "@/lib/saved-filters";
import { haystack } from "@/lib/search/live-query";
import { RecordLink } from "@/components/record-links";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { AddCarrierDialog } from "@/components/carriers/add-carrier-dialog";
import { portalCredentialLabel } from "@/lib/carriers/portal-status";
import { formatDisplayDate } from "@/lib/dates/display-format";

export const dynamic = "force-dynamic";

export default async function CarriersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = pickFilterParams(params, ["status", "line", "business", "portal"]);
  const q = firstParam(params.q) ?? "";
  const [all, tagCatalog] = await Promise.all([
    listCarriersDesk(),
    listModuleTags("carriers").catch(() => []),
  ]);

  const rows = all
    .filter((row) => {
      const { carrier, hasActiveBusiness, portalCredStatus } = row;
      const rawDesk = (carrier as { deskStatus?: string | null }).deskStatus?.toLowerCase();
      const statusLabel =
        rawDesk === "pending"
          ? "Pending"
          : rawDesk === "inactive" || (!rawDesk && !carrier.active)
            ? "Inactive"
            : "Active";
      if (!matchesField(statusLabel, filter.status)) return false;
      if (
        filter.line &&
        !(carrier.writtenLines ?? []).some((line) => line.toUpperCase() === filter.line.toUpperCase())
      ) {
        return false;
      }
      if (filter.business === "active" && !hasActiveBusiness) return false;
      if (filter.business === "directory" && hasActiveBusiness) return false;
      if (filter.portal === "connected" && portalCredStatus !== "connected") return false;
      if (filter.portal === "missing" && portalCredStatus !== "missing_credentials") return false;
      if (q) {
        const hay = haystack([carrier.name, carrier.agencyCode, ...(carrier.writtenLines ?? [])]).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => b.premiumVolume - a.premiumVolume || a.carrier.name.localeCompare(b.carrier.name));

  return (
    <AppShell
      title="Carriers"
      actions={
        <div className="flex items-center gap-2">
          <AddCarrierDialog />
        </div>
      }
    >
      <p className="mb-3 text-base text-muted-foreground">
        Agency carrier directory — one record, permission-filtered for agents. Same fields update
        instantly for everyone.
      </p>
      <SavedFiltersBar
        moduleId="carriers"
        searchPlaceholder="Search carrier name or agency code…"
        fields={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "Active", label: "Active" },
              { value: "Pending", label: "Pending" },
              { value: "Inactive", label: "Inactive" },
            ],
          },
          {
            key: "line",
            label: "Written lines",
            options: LINES.map((value) => ({ value, label: value })),
          },
          {
            key: "business",
            label: "Book",
            options: [
              { value: "active", label: "Has active business" },
              { value: "directory", label: "Directory only" },
            ],
          },
          {
            key: "portal",
            label: "Portal",
            options: [
              { value: "connected", label: "Connected" },
              { value: "missing", label: "Missing credentials" },
            ],
          },
        ]}
      />
      <section className="ff-card overflow-hidden">
        <ModuleListActions
          module="carriers"
          recordIds={[...new Set(rows.map(({ carrier }) => carrier.id))]}
          records={[
            ...new Map(
              rows.map(({ carrier }) => [
                carrier.id,
                {
                  id: carrier.id,
                  label: carrier.name,
                  email: carrier.email ?? carrier.underwriterEmail ?? carrier.accountManagerEmail,
                  phone: carrier.phone ?? carrier.agentPhone ?? carrier.customerServicePhone ?? carrier.underwriterPhone,
                },
              ]),
            ).values(),
          ]}
        >
          <DeskColumnTable
            moduleId="carriers"
            initialQuery={q}
            columns={CARRIERS_LIST_COLUMNS}
            defaultSort={{ key: "premium", dir: "desc" }}
            empty={
              <div className="space-y-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">No carriers match this filter.</p>
                <div className="flex justify-center">
                  <AddCarrierDialog />
                </div>
              </div>
            }
            rows={rows.map((row) => {
              const { carrier, activePolicyCount, premiumVolume, lastQuoteAt, portalCredStatus } = row;
              return {
                key: carrier.id,
                hay: haystack([
                  carrier.name,
                  carrier.agencyCode,
                  ...(carrier.writtenLines ?? []),
                  ...(carrier.tags ?? []),
                ]),
                sort: {
                  pick: "",
                  carrier: carrier.name,
                  status: carrier.active ? "Active" : "Inactive",
                  lines: (carrier.writtenLines ?? []).join(", "),
                  activePolicies: String(activePolicyCount).padStart(8, "0"),
                  premium: String(Math.round(premiumVolume * 100)).padStart(16, "0"),
                  lastQuote: lastQuoteAt ? new Date(lastQuoteAt).toISOString() : "",
                  portal: portalCredStatus,
                  tags: tagSortText(carrier.tags),
                },
                cells: {
                  pick: <SelectRowCheckbox id={carrier.id} />,
                  carrier: (
                    <div className="font-medium">
                      <RecordLink href={`/carriers/${carrier.id}`}>{carrier.name}</RecordLink>
                      {carrier.agencyCode ? (
                        <div className="text-xs text-muted-foreground">{carrier.agencyCode}</div>
                      ) : null}
                    </div>
                  ),
                  status: (
                    <span
                      className={
                        carrier.active
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                      }
                    >
                      {carrier.active ? "Active" : "Inactive"}
                    </span>
                  ),
                  lines: (
                    <span className="text-xs">{(carrier.writtenLines ?? []).join(", ") || "—"}</span>
                  ),
                  activePolicies: <span className="text-xs tabular-nums">{activePolicyCount}</span>,
                  premium: (
                    <span className="text-xs tabular-nums">
                      {premiumVolume > 0 ? formatMoney(premiumVolume) : "—"}
                    </span>
                  ),
                  lastQuote: (
                    <span className="text-xs">
                      {lastQuoteAt ? formatDisplayDate(lastQuoteAt) : "—"}
                    </span>
                  ),
                  portal: (
                    <span
                      className={
                        portalCredStatus === "connected"
                          ? "text-xs font-medium text-green-800"
                          : "text-xs font-medium text-amber-800"
                      }
                    >
                      {portalCredentialLabel(portalCredStatus)}
                    </span>
                  ),
                  tags: (
                    <AssignRecordTags
                      module="carriers"
                      recordId={carrier.id}
                      tags={carrier.tags}
                      catalog={tagCatalog}
                    />
                  ),
                },
              };
            })}
          />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
