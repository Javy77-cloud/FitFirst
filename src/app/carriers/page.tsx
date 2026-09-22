import { AppShell } from "@/components/app-shell";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { listCarriersDesk } from "@/lib/db/queries";
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
import { RecordLink } from "@/components/record-links";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import Link from "next/link";
import { AddCarrierDialog } from "@/components/carriers/add-carrier-dialog";
import { CarrierLobFilter } from "@/components/book-lists/carrier-lob-filter";
import { BookCommandWorkspace } from "@/components/book-lists/book-workspace";
import { loadCarrierLobUsage, loadCarrierMarketSignals } from "@/lib/book-lists/load";
import { carrierMarketGlance } from "@/lib/book-lists/kpi";
import { matchesBookLens, parseBookHeat, parseBookLens, parseBookLob } from "@/lib/book-lists/lenses";
import { presentCarrierCard } from "@/lib/book-lists/present";
import { bookFamily } from "@/lib/desk/policy-line";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { deskNow } from "@/lib/home/as-of";

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

export default async function CarriersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q) ?? "";
  const heat = parseBookHeat(firstParam(params.heat));
  const lens = parseBookLens(firstParam(params.lens));
  const requestedLob = parseBookLob(firstParam(params.lob));
  const [all, tagCatalog, pageFilters, session, usage, lineSettings] = await Promise.all([
    listCarriersDesk(),
    listModuleTags("carriers").catch(() => []),
    loadPageFilterPrefs("carriers"),
    currentDeskSession(),
    loadCarrierLobUsage(),
    loadDeskLineSettings(),
  ]);
  const lobChoices = lineSettings.writeLife || lineSettings.writeHealth;
  const lob =
    lobChoices &&
    requestedLob &&
    (requestedLob === "pc" ||
      (requestedLob === "life" && lineSettings.writeLife) ||
      (requestedLob === "health" && lineSettings.writeHealth))
      ? requestedLob
      : null;
  const familiesByCarrier = new Map<string, Array<"pc" | "life" | "health">>();
  for (const row of usage) {
    const family = bookFamily(row.lineOfBusiness);
    if (family === "life" && !lineSettings.writeLife) continue;
    if (family === "health" && !lineSettings.writeHealth) continue;
    const prev = familiesByCarrier.get(row.carrierId) ?? [];
    if (!prev.includes(family)) prev.push(family);
    familiesByCarrier.set(row.carrierId, prev);
  }
  const visibleFilters = enabledPageFilters(pageFilters);
  const filter = pickFilterParams(params, pageFilterParamKeys(visibleFilters));
  const filtered = all.filter((row) => {
    const { carrier } = row;
    if (!matchesPageFilters(carrierFilterValues(row), filter)) return false;
    if (q) {
      const appetiteRows = normalizeAppetiteRows(
        (carrier as { appetiteRows?: unknown }).appetiteRows,
      );
      const dontWriteRows = normalizeDontWriteRows(
        (carrier as { dontWriteRows?: unknown }).dontWriteRows,
      );
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
  });

  const signals = await loadCarrierMarketSignals(
    filtered.map((row) => ({
      id: row.carrier.id,
      name: row.carrier.name,
      lastContactedAt: row.carrier.lastContactedAt,
    })),
    filtered.map((row) => ({
      id: row.carrier.id,
      lastQuoteAt: row.lastQuoteAt,
      lastIssuedAt: row.lastIssuedAt,
      activePolicyCount: row.activePolicyCount,
    })),
  );
  const asOf = deskNow();
  const cards = filtered
    .map((row) =>
      presentCarrierCard(
        { ...row.carrier, premiumVolume: row.premiumVolume },
        {
          ...(signals.get(row.carrier.id) ?? {
            rateable: null,
            skipDecline: false,
            skipWhy: null,
            limited: false,
            appetiteLines: row.carrier.writtenLines ?? [],
            dontWrite: [],
            lastUseAt: row.lastQuoteAt ?? row.lastIssuedAt,
            lastUseKind: row.lastQuoteAt ? "quote" : row.lastIssuedAt ? "issued" : null,
            declineCount: 0,
            skipCount: 0,
            activePolicies: row.activePolicyCount,
          }),
          premiumVolume: row.premiumVolume,
          bookFamilies: familiesByCarrier.get(row.carrier.id) ?? [],
        },
        asOf,
        lineSettings,
      ),
    )
    .filter((card) => matchesBookLens(card, { heat, lens, q: heat || lens ? q : "" }))
    .filter((card) => !lob || (card.flags.families ?? []).includes(lob));
  const shownCarriers = new Set(cards.map((card) => card.id));
  const market = carrierMarketGlance({
    writeLife: lob ? lob === "life" : lineSettings.writeLife,
    writeHealth: lob ? lob === "health" : lineSettings.writeHealth,
    usage: usage
      .filter((row) => shownCarriers.has(row.carrierId))
      .filter((row) => !lob || bookFamily(row.lineOfBusiness) === lob)
      .map((row) => ({
        carrierId: row.carrierId,
        carrierName: row.carrierName,
        family: bookFamily(row.lineOfBusiness),
        policies: row.policies,
        premium: row.premium,
      })),
  });
  const shareLabel =
    lob === "life" ? "Life premium" : lob === "health" ? "Health premium" : lob === "pc" ? "P&C premium" : "Premium share";

  const appetiteHits = q
    ? filtered
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
        Quote-ready, skip-decline, and stale markets — scannable for quoting, not every field as a column.
      </p>
      {q && appetiteHits.length > 0 ? (
        <section
          className="mb-3 rounded-lg border border-[#002868]/20 bg-slate-50 p-3"
          data-ff-carrier-appetite-search=""
        >
          <h3 className="text-sm font-semibold text-[#002868]">
            Appetite cue · &quot;{q}&quot;
          </h3>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#002868]">
                Writes ({writesHits.length})
              </p>
              {writesHits.slice(0, 6).map(({ row, hit }) => (
                <p key={`w-${row.carrier.id}`} className="text-sm">
                  <RecordLink href={`/carriers/${row.carrier.id}`}>{row.carrier.name}</RecordLink>
                  {hit.writesSnippet ? (
                    <span className="block text-xs text-muted-foreground">{hit.writesSnippet}</span>
                  ) : null}
                </p>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#BF0A30]">
                Don&apos;t write ({excludesHits.length})
              </p>
              {excludesHits.slice(0, 6).map(({ row, hit }) => (
                <p key={`x-${row.carrier.id}`} className="text-sm">
                  <RecordLink href={`/carriers/${row.carrier.id}`}>{row.carrier.name}</RecordLink>
                  {hit.excludesSnippet ? (
                    <span className="block text-xs text-[#BF0A30]/90">{hit.excludesSnippet}</span>
                  ) : null}
                </p>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <div className="mb-3 rounded-xl border border-border/80 bg-card/80 px-3 py-2 shadow-sm">
        <PipelineFilterPopover
          moduleId="carriers"
          fields={filterFieldsFromPageFilters(visibleFilters)}
          searchPlaceholder="Find a market, appetite, or don't-write…"
          preserveParams={["heat", "lens", "lob"]}
          canConfigure={session.isAdmin}
          searchClassName={PAGE_FILTER_SEARCH_CLASS}
          searchInputClassName={PAGE_FILTER_SEARCH_INPUT_CLASS}
        />
      </div>
      <ModuleListActions
        module="carriers"
        recordIds={[...new Set(cards.map((card) => card.id))]}
        records={[
          ...new Map(
            filtered.map(({ carrier }) => [
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
        <BookCommandWorkspace
          surface="carriers"
          path="/carriers"
          layout="stack"
          cards={cards}
          heat={heat}
          lens={lens}
          q={q}
          empty="No markets in this lens. Clear a chip or add a carrier."
          banner={{ ...market, shareLabel }}
          preserve={lob ? { lob } : undefined}
          renderLeading={(card) => <SelectRowCheckbox id={card.id} />}
          renderExtra={(card) => (
            <>
              <AssignRecordTags
                module="carriers"
                recordId={card.id}
                tags={card.tags}
                catalog={tagCatalog}
                emptyPlaceholder="none"
              />
              <span className="sr-only">{tagSortText(card.tags)}</span>
            </>
          )}
        >
          <CarrierLobFilter
            path="/carriers"
            lob={lob}
            heat={heat}
            lens={lens}
            q={q}
            writeLife={lineSettings.writeLife}
            writeHealth={lineSettings.writeHealth}
          />
        </BookCommandWorkspace>
      </ModuleListActions>
    </AppShell>
  );
}
