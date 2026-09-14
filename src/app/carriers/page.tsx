import { AppShell } from "@/components/app-shell";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { formatMoney } from "@/lib/domain";
import { listCarriersDesk } from "@/lib/db/queries";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { CARRIERS_LIST_COLUMNS, type ListColumn } from "@/lib/list-columns";
import { PipelineFilterPopover } from "@/components/filters/pipeline-filter-popover";
import { firstParam, pickFilterParams } from "@/lib/saved-filters";
import {
  enabledPageFilters,
  filterFieldsFromPageFilters,
  PAGE_FILTER_SEARCH_CLASS,
  PAGE_FILTER_SEARCH_INPUT_CLASS,
  matchesPageFilters,
  pageFilterParamKeys,
} from "@/lib/page-filters";
import { loadPageFilterPrefs } from "@/lib/page-filters/store";
import { currentDeskSession } from "@/lib/auth/session";
import {
  carrierListHaystack,
  matchAppetiteSearch,
} from "@/lib/carriers/appetite-search";
import {
  normalizeAppetiteRows,
  normalizeDontWriteRows,
} from "@/lib/carriers/appetite-rows";
import { formatHitRatePct, formatDays } from "@/lib/carriers/metrics";
import { RecordLink } from "@/components/record-links";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import Link from "next/link";
import { AddCarrierDialog } from "@/components/carriers/add-carrier-dialog";
import { CarrierPortalStatusCell } from "@/components/carriers/carrier-portal-status-cell";
import { formatDisplayDate } from "@/lib/dates/display-format";

export const dynamic = "force-dynamic";


function carrierDeskStatus(carrier: { active?: boolean | null; deskStatus?: string | null }): string {
  const rawDesk = carrier.deskStatus?.toLowerCase();
  if (rawDesk === "pending") return "Pending";
  if (rawDesk === "inactive" || (!rawDesk && !carrier.active)) return "Inactive";
  return "Active";
}

function carrierPortalKey(status: string): string {
  if (status === "connected") return "connected";
  if (status === "missing_credentials") return "missing";
  return "none";
}

function carrierFilterValues(row: {
  carrier: {
    name: string;
    active?: boolean | null;
    deskStatus?: string | null;
    writtenLines?: string[] | null;
    amBestRating?: string | null;
    tags?: string[] | null;
  };
  hasActiveBusiness: boolean;
  portalCredStatus: string;
  autoLabel?: string | null;
}) {
  const { carrier, hasActiveBusiness, portalCredStatus } = row;
  const lines = carrier.writtenLines ?? [];
  return {
    status: carrierDeskStatus(carrier),
    line: lines,
    lines,
    business: hasActiveBusiness ? "active" : "directory",
    portal: carrierPortalKey(portalCredStatus),
    amBest: carrier.amBestRating ?? "",
    label: row.autoLabel ?? "",
    carrier: carrier.name,
    tags: carrier.tags ?? [],
  };
}

function columnsForData(has: {
  label: boolean;
  commission: boolean;
  hitRate: boolean;
  avgDays: boolean;
  amBest: boolean;
}): ListColumn[] {
  return CARRIERS_LIST_COLUMNS.map((col) => {
    if (col.id === "label") return { ...col, defaultOn: has.label };
    if (col.id === "commission") return { ...col, defaultOn: has.commission };
    if (col.id === "hitRate") return { ...col, defaultOn: has.hitRate };
    if (col.id === "avgDays") return { ...col, defaultOn: has.avgDays };
    if (col.id === "amBest") return { ...col, defaultOn: has.amBest };
    return col;
  });
}

export default async function CarriersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q) ?? "";
  const [all, tagCatalog, pageFilters, session] = await Promise.all([
    listCarriersDesk(),
    listModuleTags("carriers").catch(() => []),
    loadPageFilterPrefs("carriers"),
    currentDeskSession(),
  ]);
  const visibleFilters = enabledPageFilters(pageFilters);
  const filter = pickFilterParams(params, pageFilterParamKeys(visibleFilters));

  const rows = all
    .filter((row) => {
      const { carrier } = row;
      if (!matchesPageFilters(carrierFilterValues(row), filter)) return false;
      const appetiteRows = normalizeAppetiteRows(
        (carrier as { appetiteRows?: unknown }).appetiteRows,
      );
      const dontWriteRows = normalizeDontWriteRows(
        (carrier as { dontWriteRows?: unknown }).dontWriteRows,
      );
      if (q) {
        const hay = carrierListHaystack({
          name: carrier.name,
          agencyCode: carrier.agencyCode,
          writtenLines: carrier.writtenLines,
          tags: carrier.tags,
          appetiteNotes: carrier.appetiteNotes,
          dontWriteNotes: carrier.dontWriteNotes,
          appetiteRows,
          dontWriteRows,
          autoLabel: row.autoLabel,
        });
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Default: last contacted ascending (nobody talked to first).
      const aT = a.carrier.lastContactedAt
        ? new Date(a.carrier.lastContactedAt).getTime()
        : 0;
      const bT = b.carrier.lastContactedAt
        ? new Date(b.carrier.lastContactedAt).getTime()
        : 0;
      if (aT !== bT) return aT - bT;
      return a.carrier.name.localeCompare(b.carrier.name);
    });

  const appetiteHits = q
    ? rows
        .map((row) => {
          const appetiteRows = normalizeAppetiteRows(
            (row.carrier as { appetiteRows?: unknown }).appetiteRows,
          );
          const dontWriteRows = normalizeDontWriteRows(
            (row.carrier as { dontWriteRows?: unknown }).dontWriteRows,
          );
          const hit = matchAppetiteSearch(
            q,
            row.carrier.appetiteNotes,
            row.carrier.dontWriteNotes,
            appetiteRows,
            dontWriteRows,
          );
          return { row, hit };
        })
        .filter((x) => x.hit.side !== "none")
    : [];
  const writesHits = appetiteHits.filter((x) => x.hit.side === "writes" || x.hit.side === "both");
  const excludesHits = appetiteHits.filter(
    (x) => x.hit.side === "excludes" || x.hit.side === "both",
  );

  const hasData = {
    label: rows.some((r) => Boolean(r.autoLabel)),
    commission: rows.some((r) => r.commissionEarned > 0),
    hitRate: rows.some((r) => r.hitRate != null),
    avgDays: rows.some((r) => r.avgDaysToBind != null),
    amBest: rows.some((r) => Boolean(r.carrier.amBestRating)),
  };
  const listColumns = columnsForData(hasData);

  return (
    <AppShell
      title="Carriers"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/carriers/compare"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
            data-ff-carrier-tool="compare"
          >
            Market Comparison
          </Link>
          <Link
            href="/carriers/calculator"
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
            data-ff-carrier-tool="calculator"
          >
            Commission Calculator
          </Link>
          <AddCarrierDialog />
        </div>
      }
    >
      <p className="mb-3 text-base text-muted-foreground">
        Agency Carrier Directory — One Record, Permission-Filtered For Agents. Search Appetite And
        Don&apos;t Write Across All Carriers (Try &quot;Flood&quot;).
      </p>
      {q && appetiteHits.length > 0 ? (
        <section
          className="mb-3 rounded-lg border border-[#002868]/20 bg-slate-50 p-3"
          data-ff-carrier-appetite-search=""
        >
          <h3 className="text-sm font-semibold text-[#002868]">
            Appetite + Don&apos;t Write · &quot;{q}&quot;
          </h3>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
                Writes / Appetite ({writesHits.length})
              </p>
              {writesHits.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">No Appetite Matches.</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {writesHits.map(({ row, hit }) => (
                    <li key={`w-${row.carrier.id}`} className="text-sm">
                      <RecordLink href={`/carriers/${row.carrier.id}`}>
                        {row.carrier.name}
                      </RecordLink>
                      {hit.writesSnippet ? (
                        <div className="text-xs text-muted-foreground">{hit.writesSnippet}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#BF0A30]">
                Don&apos;t Write / Excludes ({excludesHits.length})
              </p>
              {excludesHits.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">No Don&apos;t Write Matches.</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {excludesHits.map(({ row, hit }) => (
                    <li key={`x-${row.carrier.id}`} className="text-sm">
                      <RecordLink href={`/carriers/${row.carrier.id}`}>
                        {row.carrier.name}
                      </RecordLink>
                      {hit.excludesSnippet ? (
                        <div className="text-xs text-[#BF0A30]/90">{hit.excludesSnippet}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}
      <PipelineFilterPopover
        moduleId="carriers"
        fields={filterFieldsFromPageFilters(visibleFilters)}
        searchPlaceholder="Contains Name, Agency Code, Appetite, Or Don't Write…"
        preserveParams={[]}
        canConfigure={session.isAdmin}
        searchClassName={PAGE_FILTER_SEARCH_CLASS}
        searchInputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
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
                  phone:
                    carrier.phone ??
                    carrier.agentPhone ??
                    carrier.customerServicePhone ??
                    carrier.underwriterPhone,
                },
              ]),
            ).values(),
          ]}
        >
          <DeskColumnTable
            moduleId="carriers"
            initialQuery={q}
            columns={listColumns}
            defaultSort={{ key: "lastContacted", dir: "asc" }}
            empty={
              <div className="space-y-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">No carriers match this filter.</p>
                <div className="flex justify-center">
                  <AddCarrierDialog />
                </div>
              </div>
            }
            rows={rows.map((row) => {
              const {
                carrier,
                activePolicyCount,
                premiumVolume,
                lastQuoteAt,
                lastIssuedAt,
                portalCredStatus,
                hitRate,
                avgDaysToBind,
                commissionEarned,
                autoLabel,
              } = row;
              const appetiteRows = normalizeAppetiteRows(
                (carrier as { appetiteRows?: unknown }).appetiteRows,
              );
              const dontWriteRows = normalizeDontWriteRows(
                (carrier as { dontWriteRows?: unknown }).dontWriteRows,
              );
              const rawDesk = (carrier as { deskStatus?: string | null }).deskStatus?.toLowerCase();
              const statusLabel =
                rawDesk === "pending"
                  ? "Pending"
                  : rawDesk === "inactive" || (!rawDesk && !carrier.active)
                    ? "Inactive"
                    : "Active";
              return {
                key: carrier.id,
                hay: carrierListHaystack({
                  name: carrier.name,
                  agencyCode: carrier.agencyCode,
                  writtenLines: carrier.writtenLines,
                  tags: carrier.tags,
                  appetiteNotes: carrier.appetiteNotes,
                  dontWriteNotes: carrier.dontWriteNotes,
                  appetiteRows,
                  dontWriteRows,
                  autoLabel,
                }),
                sort: {
                  pick: "",
                  carrier: carrier.name,
                  label: autoLabel,
                  status: statusLabel,
                  lines: (carrier.writtenLines ?? []).join(", "),
                  activePolicies: String(activePolicyCount).padStart(8, "0"),
                  premium: String(Math.round(premiumVolume * 100)).padStart(16, "0"),
                  commission: String(Math.round(commissionEarned * 100)).padStart(16, "0"),
                  hitRate: hitRate == null ? "" : String(Math.round(hitRate * 10000)).padStart(8, "0"),
                  avgDays:
                    avgDaysToBind == null
                      ? ""
                      : String(Math.round(avgDaysToBind * 100)).padStart(10, "0"),
                  lastQuote: lastQuoteAt ? new Date(lastQuoteAt).toISOString() : "",
                  lastIssued: lastIssuedAt ? new Date(lastIssuedAt).toISOString() : "",
                  // Empty last contacted sorts first (ascending = nobody talked to first).
                  lastContacted: carrier.lastContactedAt
                    ? new Date(carrier.lastContactedAt).toISOString()
                    : "0000-01-01T00:00:00.000Z",
                  amBest: carrier.amBestRating ?? "",
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
                  label: <span className="text-xs text-muted-foreground">{autoLabel}</span>,
                  status: (
                    <span
                      className={
                        statusLabel === "Active"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                          : statusLabel === "Pending"
                            ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                            : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                      }
                    >
                      {statusLabel}
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
                  commission: (
                    <span className="text-xs tabular-nums">
                      {commissionEarned > 0 ? formatMoney(commissionEarned) : "—"}
                    </span>
                  ),
                  hitRate: (
                    <span className="text-xs tabular-nums">{formatHitRatePct(hitRate)}</span>
                  ),
                  avgDays: (
                    <span className="text-xs tabular-nums">{formatDays(avgDaysToBind)}</span>
                  ),
                  lastQuote: (
                    <span className="text-xs">
                      {lastQuoteAt ? formatDisplayDate(lastQuoteAt) : "—"}
                    </span>
                  ),
                  lastIssued: (
                    <span className="text-xs">
                      {lastIssuedAt ? formatDisplayDate(lastIssuedAt) : "—"}
                    </span>
                  ),
                  lastContacted: (
                    <span className="text-xs">
                      {carrier.lastContactedAt
                        ? formatDisplayDate(carrier.lastContactedAt)
                        : "—"}
                    </span>
                  ),
                  amBest: (
                    <span className="text-xs">{carrier.amBestRating || "—"}</span>
                  ),
                  portal: (
                    <CarrierPortalStatusCell
                      carrierId={carrier.id}
                      status={portalCredStatus}
                      href={
                        (carrier.portalUrl || carrier.agentPortalUrl || carrier.website || "").trim() ||
                        null
                      }
                    />
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
