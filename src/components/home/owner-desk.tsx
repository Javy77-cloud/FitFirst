import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Building2,
  Cake,
  CircleDollarSign,
  RefreshCcw,
  Shield,
  Users,
} from "lucide-react";
import { markAlertRead } from "@/app/actions/alerts";
import { formatMoney } from "@/lib/domain";
import type { OwnerHomeSnapshot } from "@/lib/home/aggregate";
import type { OwnerHomeScope } from "@/lib/home/scope";
import type { OwnerHomeTables } from "@/lib/home/optional-tables";
import type {
  AgencyHomeHighlight,
  HomeAgentOption,
  HomeContestView,
  HomeDashboardPrefs,
  HomeLeadOfferView,
} from "@/lib/db/queries";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MixBars } from "./mix-bars";
import { MixDonut } from "./mix-donut";
import { CrossSellPanel } from "./cross-sell";
import { AttentionFilters } from "./attention-filters";
import { DashboardToolbar } from "./dashboard-toolbar";
import { ContestBoard } from "./contest-board";
import { LeadOfferBoard } from "./lead-offer-board";
import { PeopleList } from "./people-list";
import { momLabel, momTone } from "./mom-label";
import { filterLineMix, type DeskLineSettings } from "@/lib/desk/line-settings";
import { filterAttentionItems, type AttentionWindow } from "@/lib/home/attention-window";
import { isWidgetVisible } from "@/lib/home/presets";
import { entityHref } from "@/lib/crm/display";
import { Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import type { BookScopeOption } from "@/lib/org/book-scope";
import { BookScopeFilter } from "./book-scope-filter";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function OwnerDesk({
  snapshot,
  scope,
  tables,
  lineSettings,
  attentionWindow = null,
  prefs,
  contests,
  leadOffers,
  agents,
  currentUserId,
  showCompanyWidgets,
  agencyHighlight,
  isAdmin,
  isAgent,
  unread,
  recentDeals,
  bookOptions = [],
  bookValue = "company",
  attentionValue,
}: {
  snapshot: OwnerHomeSnapshot;
  scope: OwnerHomeScope;
  tables: OwnerHomeTables;
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  attentionWindow?: AttentionWindow | null;
  prefs: HomeDashboardPrefs;
  contests: HomeContestView[];
  leadOffers: HomeLeadOfferView[];
  agents: HomeAgentOption[];
  currentUserId: string | null;
  showCompanyWidgets: boolean;
  agencyHighlight: AgencyHomeHighlight;
  isAdmin: boolean;
  isAgent: boolean;
  unread: { id: string; title: string; body: string; entityType: string | null; entityId: string | null }[];
  recentDeals: { id: string; title: string; pipelineStage: string; lineOfBusiness: string }[];
  bookOptions?: BookScopeOption[];
  bookValue?: string;
  attentionValue?: string;
}) {
  void tables;
  const asOf = snapshot.asOf.toLocaleString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const show = (id: Parameters<typeof isWidgetVisible>[0]) =>
    isWidgetVisible(id, prefs.preset, prefs.hiddenWidgets, { showCompanyWidgets, isAgent });

  return (
    <div className="space-y-4">
      <section className="ff-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-[color:var(--ff-wash)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {scope.role === "agent" ? "Agent home" : "Owner home"}
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-navy">
              {scope.bookScope === "agency" && scope.canToggleBook
                ? "How the agency book is doing"
                : "How your book is doing"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {scope.agentUserId
                ? "Your in-force and open shops only. Quotes — including Ana Dib's $321,000 HO3 — stay unbound."
                : "Agency totals. In-force is Active or Bound only. Ana Dib's $321,000 HO3 shop is pipeline, not written premium."}{" "}
              Figures are from the seed, as of {asOf}.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {scope.role !== "agent" && bookOptions.length > 0 ? (
              <BookScopeFilter
                options={bookOptions}
                current={bookValue}
                attention={attentionValue}
              />
            ) : null}
            <div className="rounded-md border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground">
              <div className="font-medium text-navy">{scope.label}</div>
              <div>
                {scope.canToggleBook ? "Admin toggle" : "Agent book"} · desk clock {asOf}
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-3">
          <DashboardToolbar
            preset={prefs.preset}
            hiddenWidgets={prefs.hiddenWidgets}
            bookScope={scope.bookScope}
            canToggleBook={scope.canToggleBook}
          />
        </div>
      </section>

      {show("kpis") ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <KpiLink
            href="/contacts?status=client"
            icon={Users}
            label="Active accounts"
            value={fmt(snapshot.activeAccounts)}
            hint="Contacts and businesses with active, bound, or pending policies"
          />
          <KpiLink
            href="/policies?status=in_force"
            icon={CircleDollarSign}
            label="Premium in-force"
            value={formatMoney(snapshot.inForcePremium)}
            hint="Active or Bound only"
          />
          <KpiLink
            href="/policies?status=in_force"
            icon={Shield}
            label="Policies"
            value={fmt(snapshot.inForceCount)}
            hint={`${formatMoney(snapshot.inForcePremium)} written`}
          />
          <KpiLink
            href="/carriers"
            icon={Building2}
            label="Carriers"
            value={fmt(snapshot.carrierCount)}
            hint="Distinct on this book"
          />
          <KpiLink
            href="/policies?written=this_month"
            icon={CircleDollarSign}
            label="Written this month"
            value={formatMoney(snapshot.written.thisMonth.premium)}
            hint={`${fmt(snapshot.written.thisMonth.count)} bound`}
            extra={
              <span className={momTone(snapshot.written.thisMonth.premium, snapshot.written.lastMonth.premium)}>
                {momLabel(snapshot.written.thisMonth.premium, snapshot.written.lastMonth.premium, true)}
              </span>
            }
          />
          {snapshot.commissions ? (
            <KpiLink
              href="/commissions"
              icon={Briefcase}
              label="Commission pending"
              value={formatMoney(snapshot.commissions.pending)}
              hint={`${formatMoney(snapshot.commissions.paid)} paid`}
            />
          ) : (
            <KpiLink
              href="/policies?renewal=60"
              icon={RefreshCcw}
              label="Renewals · 60 days"
              value={fmt(snapshot.renewals60.count)}
              hint={formatMoney(snapshot.renewals60.premium)}
            />
          )}
        </div>
      ) : null}

      {show("ratios") ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <StatCard
            label="Premium / account"
            value={formatMoney(snapshot.premiumPerAccount)}
            hint={`${fmt(snapshot.activeAccounts)} active accounts`}
          />
          <StatCard
            label="Premium / policy"
            value={formatMoney(snapshot.premiumPerPolicy)}
            hint={`${fmt(snapshot.inForceCount)} in-force policies`}
          />
          <StatCard
            label="Policies / account"
            value={snapshot.policiesPerAccount.toFixed(2)}
            hint="In-force policies ÷ active accounts"
          />
        </div>
      ) : null}

      {show("mom") ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <KpiLink
            href="/policies?written=this_month"
            icon={CircleDollarSign}
            label="New business this month"
            value={formatMoney(snapshot.newBusiness.thisMonth.premium)}
            hint={`${fmt(snapshot.newBusiness.thisMonth.count)} first-term writings`}
            extra={
              <span className={momTone(snapshot.newBusiness.thisMonth.premium, snapshot.newBusiness.lastMonth.premium)}>
                {momLabel(snapshot.newBusiness.thisMonth.premium, snapshot.newBusiness.lastMonth.premium, true)}
              </span>
            }
          />
          <KpiLink
            href="/policies?written=this_month"
            icon={RefreshCcw}
            label="Renewals this month"
            value={formatMoney(snapshot.renewalsWritten.thisMonth.premium)}
            hint={`${fmt(snapshot.renewalsWritten.thisMonth.count)} renewed writings`}
            extra={
              <span
                className={momTone(
                  snapshot.renewalsWritten.thisMonth.premium,
                  snapshot.renewalsWritten.lastMonth.premium,
                )}
              >
                {momLabel(
                  snapshot.renewalsWritten.thisMonth.premium,
                  snapshot.renewalsWritten.lastMonth.premium,
                  true,
                )}
              </span>
            }
          />
          <KpiLink
            href="/policies?status=cancelled"
            icon={AlertTriangle}
            label="Cancellations this month"
            value={fmt(snapshot.cancellations.thisMonth.count)}
            hint={formatMoney(snapshot.cancellations.thisMonth.premium)}
            extra={
              <span
                className={momTone(
                  snapshot.cancellations.thisMonth.count,
                  snapshot.cancellations.lastMonth.count,
                  true,
                )}
              >
                {momLabel(snapshot.cancellations.thisMonth.count, snapshot.cancellations.lastMonth.count)}
              </span>
            }
          />
        </div>
      ) : null}

      {show("strip") ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <StripLink href="/leads" label="Active leads" value={fmt(snapshot.strip.activeLeads)} />
          <StripLink href="/deals?stage=open" label="Open deals" value={fmt(snapshot.strip.openDeals)} />
          <StripLink href="/deals?stage=quote_sent" label="Quote sent" value={fmt(snapshot.pipeline.quoteSent)} />
          <StripLink href="/work-queue" label="Lapse" value={fmt(snapshot.strip.lapseCount)} />
          <StripLink href="/work-queue" label="Bound / pending" value={fmt(snapshot.strip.boundPending)} />
          <StripLink
            href="/policies?status=cancelled"
            label="Cancelled / terminated"
            value={`${fmt(snapshot.strip.cancelledCount)} / ${fmt(snapshot.strip.terminatedCount)}`}
          />
        </div>
      ) : null}

      {show("company") ? (
        <section className="ff-card p-4">
          <h3 className="text-sm font-semibold text-navy">Agency this month</h3>
          <p className="text-[11px] text-muted-foreground">
            Company widget on agent desks when Admin turns it on. Ana&apos;s shop is still not written premium.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <StatCard
              label="Agency written"
              value={formatMoney(agencyHighlight.writtenThisMonth)}
              hint={`${fmt(agencyHighlight.writtenCount)} policies`}
            />
            <StatCard
              label="Agency in-force"
              value={formatMoney(agencyHighlight.inForcePremium)}
              hint={`${fmt(agencyHighlight.inForceCount)} policies`}
            />
            <StatCard label="Open pipeline" value={fmt(snapshot.pipeline.openQuotes)} hint="Open shops on this view" />
          </div>
        </section>
      ) : null}

      {show("charts") ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="ff-card p-3" aria-label="Policy type">
            <Header title="Policies by line of business" href="/policies?status=in_force" action="Policies" />
            <p className="mb-2 mt-1 text-[11px] text-muted-foreground">
              In-force premium by policy type. Quotes are not written.
            </p>
            <MixDonut
              slices={lineSettings ? filterLineMix(snapshot.lineMix, lineSettings) : snapshot.lineMix}
              empty="No in-force policy types yet."
            />
          </section>
          <section className="ff-card p-3">
            <Header title="Carrier by business share" href="/policies?status=in_force" action="Policies" />
            <p className="mb-2 mt-1 text-[11px] text-muted-foreground">
              Top writing companies on this book. Compact share bars.
            </p>
            <MixBars compact slices={snapshot.carrierMix} empty="No in-force carriers yet." />
          </section>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {show("leaderboard") ? (
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-navy">Production leaderboard</h3>
              <p className="text-[11px] text-muted-foreground">
                Top 10 this month and last month. Agency ranking is visible so producers can see who is winning.
              </p>
            </div>
            <div className="grid gap-0 sm:grid-cols-2">
              <LeaderTable title="This month" rows={snapshot.leaderboardThisMonth} />
              <LeaderTable title="Last month" rows={snapshot.leaderboardLastMonth} />
            </div>
          </section>
        ) : null}
        {show("contest") ? <ContestBoard contests={contests} isAdmin={isAdmin} /> : null}
      </div>

      {show("lead_offers") ? (
        <LeadOfferBoard
          offers={leadOffers}
          agents={agents}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {show("birthdays") ? (
          <section className="ff-card p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-navy">
              <Cake className="size-3.5 text-primary" />
              Birthdays
            </h3>
            <p className="mb-3 text-[11px] text-muted-foreground">From Contact date of birth. Scoped to this book.</p>
            <div className="space-y-4">
              <PeopleList title="Today" rows={snapshot.birthdays.today} empty="No birthdays today." />
              <PeopleList title="Next week" rows={snapshot.birthdays.nextWeek} empty="Nobody in the next seven days." />
              <PeopleList title="Next month" rows={snapshot.birthdays.nextMonth} empty="Nobody next month." />
            </div>
          </section>
        ) : null}
        {show("turning65") ? (
          <section className="ff-card p-4">
            <h3 className="text-sm font-semibold text-navy">Turning 65</h3>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Life / Medicare prep. Contacts who turn 65 next month or next year.
            </p>
            <div className="space-y-4">
              <PeopleList
                title="Next month"
                rows={snapshot.turning65.nextMonth}
                empty="Nobody turns 65 next month."
              />
              <PeopleList
                title="Next year"
                hint="Medicare enrollment window"
                rows={snapshot.turning65.nextYear}
                empty="Nobody turns 65 next year."
              />
            </div>
          </section>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {show("renewals") ? (
          <section className="ff-card p-4">
            <Header title="Renewals" href="/policies?renewal=60" action="Open list" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link href="/policies?renewal=30" className="rounded-md border border-border bg-secondary/70 px-3 py-3 hover:border-primary">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">In 30 days</div>
                <div className="text-lg font-semibold text-navy">{fmt(snapshot.renewals30.count)}</div>
                <div className="text-sm text-muted-foreground">{formatMoney(snapshot.renewals30.premium)}</div>
              </Link>
              <Link href="/policies?renewal=60" className="rounded-md border border-border bg-secondary/70 px-3 py-3 hover:border-primary">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">In 60 days</div>
                <div className="text-lg font-semibold text-navy">{fmt(snapshot.renewals60.count)}</div>
                <div className="text-sm text-muted-foreground">{formatMoney(snapshot.renewals60.premium)}</div>
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              30-day names sit inside the 60-day window. Counts are in-force terms only.
            </p>
          </section>
        ) : null}

        {show("attention") ? (
          <section className="ff-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-navy">Needs attention</h3>
                <p className="text-[11px] text-muted-foreground">Overdue, this week, this month, next month</p>
              </div>
              <Link href="/work-queue" className="text-[12px] font-medium text-primary hover:underline">
                Work queue
              </Link>
            </div>
            <div className="border-b border-border px-4 py-2">
              <AttentionFilters current={attentionWindow} basePath="/" />
            </div>
            {(() => {
              const rows = filterAttentionItems(snapshot.attention, snapshot.asOf, attentionWindow);
              if (rows.length === 0) {
                return (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    {snapshot.attention.length === 0 ? "Nothing flagged on the book." : "Nothing in this window."}
                  </p>
                );
              }
              return (
                <ul className="divide-y divide-border">
                  {rows.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/50">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-fit-flag" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-navy">{item.title}</div>
                          <div className="text-[12px] text-muted-foreground">
                            {item.detail} · due {item.dueAt.toISOString().slice(0, 10)} · {item.priority} · {item.status}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </section>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {show("cross_sell") ? <CrossSellPanel rows={snapshot.holders} /> : null}
        {show("ana") ? (
          <section className="ff-card p-4">
            <h3 className="text-sm font-semibold text-navy">Ana Dib shop</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Still an unbound Palm Bay HO3. Coverage A is $321,000. Eight markets, zero bindable.
              She is open pipeline — not an in-force policy.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/deals/${DEAL_ID}`} className={cn(buttonVariants())}>
                Open the shop
              </Link>
              <Link href="/deals?stage=open" className={cn(buttonVariants({ variant: "outline" }))}>
                Open quotes
              </Link>
              <Link href="/deals?stage=quote_sent" className={cn(buttonVariants({ variant: "outline" }))}>
                Quote sent
              </Link>
              <Link href="/deals?stage=won" className={cn(buttonVariants({ variant: "outline" }))}>
                Closed won
              </Link>
            </div>
          </section>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {show("alerts") ? (
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">In-app alerts</div>
            {unread.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No unread alerts.</p>
            ) : (
              <ul className="divide-y divide-border">
                {unread.map((alert) => (
                  <li key={alert.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div>
                      {entityHref(alert.entityType, alert.entityId) ? (
                        <Link
                          href={entityHref(alert.entityType, alert.entityId)!}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {alert.title}
                        </Link>
                      ) : (
                        <div className="text-sm font-medium">{alert.title}</div>
                      )}
                      <p className="text-xs text-muted-foreground">{alert.body}</p>
                    </div>
                    <form action={markAlertRead}>
                      <input type="hidden" name="alertId" value={alert.id} />
                      <Button type="submit" variant="ghost" size="xs">
                        Dismiss
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {show("recent_deals") ? (
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">Recent deals</div>
            <table className="ff-table">
              <thead>
                <tr>
                  <Col table="home-deals" col="title" as="th">
                    Deal
                  </Col>
                  <Col table="home-deals" col="stage" as="th">
                    Stage
                  </Col>
                  <Col table="home-deals" col="line" as="th">
                    Line
                  </Col>
                </tr>
              </thead>
              <SheetTbody>
                {recentDeals.map((deal) => (
                  <tr key={deal.id}>
                    <Col table="home-deals" col="title">
                      <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                        {deal.title}
                      </Link>
                    </Col>
                    <Col table="home-deals" col="stage" className="uppercase">
                      {deal.pipelineStage.replaceAll("_", " ")}
                    </Col>
                    <Col table="home-deals" col="line">
                      {deal.lineOfBusiness}
                    </Col>
                  </tr>
                ))}
              </SheetTbody>
            </table>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Header({ title, href, action }: { title: string; href: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      <Link href={href} className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
        {action}
        <ArrowUpRight className="size-3" />
      </Link>
    </div>
  );
}

function KpiLink({
  href,
  icon: Icon,
  label,
  value,
  hint,
  extra,
}: {
  href: string;
  icon: typeof Shield;
  label: string;
  value: string;
  hint: string;
  extra?: ReactNode;
}) {
  return (
    <Link href={href} className="ff-card group p-3 hover:border-primary">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-md bg-secondary p-1.5 text-primary">
          <Icon className="size-3.5" />
        </div>
        <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-xl font-semibold tabular-nums text-navy">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      {extra ? <div className="mt-1 text-[12px]">{extra}</div> : null}
    </Link>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="ff-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-xl font-semibold tabular-nums text-navy">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function StripLink({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href} className="rounded-md border border-border bg-card px-3 py-2 hover:border-primary">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-navy">{value}</div>
    </Link>
  );
}

function LeaderTable({
  title,
  rows,
}: {
  title: string;
  rows: OwnerHomeSnapshot["leaderboardThisMonth"];
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No writings in this month.</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <li key={`${title}-${row.userId}`} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate">
                <span className="mr-2 tabular-nums text-muted-foreground">{row.rank}.</span>
                <span className="font-medium text-navy">{row.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatMoney(row.premium)} · {row.policyCount}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
