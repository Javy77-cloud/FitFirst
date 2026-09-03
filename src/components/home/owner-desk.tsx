import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CircleDollarSign,
  Layers,
  RefreshCcw,
  Shield,
  Split,
} from "lucide-react";
import { formatMoney } from "@/lib/domain";
import type { OwnerHomeSnapshot } from "@/lib/home/aggregate";
import type { OwnerHomeScope } from "@/lib/home/scope";
import type { OwnerHomeTables } from "@/lib/home/optional-tables";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MixBars } from "./mix-bars";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function writtenDelta(thisMonth: number, lastMonth: number): string {
  if (lastMonth === 0 && thisMonth === 0) return "No writings in either month";
  if (lastMonth === 0) return "No writings last month";
  const change = thisMonth - lastMonth;
  const pct = Math.round((change / lastMonth) * 100);
  if (change === 0) return "Flat vs last month";
  return `${change > 0 ? "+" : "−"}${formatMoney(Math.abs(change))} · ${Math.abs(pct)}% vs last month`;
}

export function OwnerDesk({
  snapshot,
  scope,
  tables,
}: {
  snapshot: OwnerHomeSnapshot;
  scope: OwnerHomeScope;
  tables: OwnerHomeTables;
}) {
  const asOf = snapshot.asOf.toLocaleString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const writtenTone =
    snapshot.written.thisMonth.premium >= snapshot.written.lastMonth.premium
      ? "text-fit-green"
      : "text-fit-flag";

  return (
    <div className="space-y-4">
      <section className="ff-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-[color:var(--ff-wash)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Owner home
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-navy">How the book is doing</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              In-force is Active or Bound only. Quotes — including Ana Dib&apos;s $321,000 HO3 shop —
              are pipeline, not written premium. Figures are from the seed, as of {asOf}.
            </p>
          </div>
          <div className="shrink-0 rounded-md border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground">
            <div className="font-medium text-navy">{scope.label}</div>
            <div>
              {scope.role === "agent" ? "Agent book" : "Admin / owner"} · desk clock {asOf}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiLink
          href="/policies?status=in_force"
          icon={Shield}
          label="In-force policies"
          value={fmt(snapshot.inForceCount)}
          hint={`${formatMoney(snapshot.inForcePremium)} written premium`}
        />
        <KpiLink
          href="/policies?written=this_month"
          icon={CircleDollarSign}
          label="Written this month"
          value={formatMoney(snapshot.written.thisMonth.premium)}
          hint={`${fmt(snapshot.written.thisMonth.count)} bound · last month ${formatMoney(snapshot.written.lastMonth.premium)}`}
          extra={<span className={writtenTone}>{writtenDelta(snapshot.written.thisMonth.premium, snapshot.written.lastMonth.premium)}</span>}
        />
        <KpiLink
          href="/deals?stage=open"
          icon={Layers}
          label="Pipeline"
          value={`${fmt(snapshot.pipeline.openQuotes)} open`}
          hint={`${fmt(snapshot.pipeline.quoteSent)} quote sent · ${fmt(snapshot.pipeline.closedWonThisMonth)} closed won this month`}
        />
        {snapshot.commissions ? (
          <KpiLink
            href="/commissions"
            icon={Briefcase}
            label="Commission"
            value={formatMoney(snapshot.commissions.pending)}
            hint={`${formatMoney(snapshot.commissions.paid)} paid`}
          />
        ) : (
          <KpiLink
            href="/policies?renewal=60"
            icon={RefreshCcw}
            label="Renewals · 60 days"
            value={`${fmt(snapshot.renewals60.count)}`}
            hint={`${formatMoney(snapshot.renewals60.premium)} coming due`}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card p-4">
          <Header
            title="Renewals"
            href="/policies?renewal=60"
            action="Open list"
          />
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

        <section className="ff-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-navy">Needs attention</h3>
              <p className="text-[11px] text-muted-foreground">
                Work-queue flags, lapses, bound waiting on issue
              </p>
            </div>
            <Link href="/work-queue" className="text-[12px] font-medium text-primary hover:underline">
              Work queue
            </Link>
          </div>
          {snapshot.attention.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nothing flagged on the book.</p>
          ) : (
            <ul className="divide-y divide-border">
              {snapshot.attention.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/50">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-fit-flag" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-navy">{item.title}</div>
                      <div className="text-[12px] text-muted-foreground">{item.detail}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card p-4">
          <Header title="Line mix" href="/policies?status=in_force" action="Policies" />
          <p className="mb-3 mt-1 text-[11px] text-muted-foreground">
            Home, Auto, Flood, Commercial, Health, Life — in-force premium. Empty lines stay at zero.
          </p>
          <MixBars slices={snapshot.lineMix} empty="No in-force lines yet. Bind a policy or load the owner-book seed." />
        </section>
        <section className="ff-card p-4">
          <Header title="Carrier mix" href="/policies?status=in_force" action="Policies" />
          <p className="mb-3 mt-1 text-[11px] text-muted-foreground">
            Writing companies on Active / Bound terms. Not a production goal chart.
          </p>
          <MixBars slices={snapshot.carrierMix} empty="No in-force carriers yet." />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Split className="size-3.5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-navy">Cross-sell gaps</h3>
                <p className="text-[11px] text-muted-foreground">
                  {tables.opportunities
                    ? "From the Opportunities table when it is present"
                    : "Households missing Home, Auto, or Flood — not a score"}
                </p>
              </div>
            </div>
            <Link
              href={tables.opportunities ? "/opportunities" : "/contacts"}
              className="text-lg font-semibold tabular-nums text-navy hover:text-primary"
            >
              {fmt(snapshot.gapCount)}
            </Link>
          </div>
          {snapshot.gaps.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No personal-lines companion gaps on the in-force book.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {snapshot.gaps.map((gap) => (
                <li key={gap.contactId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-medium text-navy">{gap.name}</span>
                  <span className="text-[12px] text-muted-foreground">Needs {gap.missing.join(", ")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

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
    <Link href={href} className="ff-card group p-4 hover:border-primary">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-md bg-secondary p-1.5 text-primary">
          <Icon className="size-3.5" />
        </div>
        <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-2xl font-semibold tabular-nums text-navy">{value}</div>
      <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>
      {extra ? <div className="mt-1 text-[12px]">{extra}</div> : null}
    </Link>
  );
}
