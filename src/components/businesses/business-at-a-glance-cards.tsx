import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import { formatDay } from "@/lib/domain";
import { displayStatusLabel } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

export type GlancePolicy = {
  id: string;
  lineOfBusiness?: string | null;
  policyType?: string | null;
  status?: string | null;
  effectiveDate?: Date | string | null;
  renewalDate?: Date | string | null;
};

export type GlanceDeal = {
  id: string;
  title: string;
  pipelineStage?: string | null;
  lineOfBusiness?: string | null;
};

export type GlanceActivity = {
  kind?: string | null;
  title?: string | null;
  occurredAt?: Date | string | null;
};

function uniqLines(policies: GlancePolicy[]): string[] {
  const out: string[] = [];
  for (const p of policies) {
    const line = String(p.lineOfBusiness || p.policyType || "").trim();
    if (!line) continue;
    if (!out.includes(line)) out.push(line);
  }
  return out;
}

function earliestEffective(policies: GlancePolicy[]): Date | null {
  let best: Date | null = null;
  for (const p of policies) {
    if (!p.effectiveDate) continue;
    const d = new Date(p.effectiveDate);
    if (!Number.isFinite(d.getTime())) continue;
    if (!best || d < best) best = d;
  }
  return best;
}

function normalizeStageKey(stage: string | null | undefined): string {
  return String(stage ?? "")
    .trim()
    .toLowerCase()
    .replace(/[/·]+/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function stageOutcome(stage: string | null | undefined): "won" | "lost" | "open" {
  const key = normalizeStageKey(stage);
  if (key === "closed_won" || key === "won" || key.endsWith("_won")) return "won";
  if (key === "closed_lost" || key === "lost" || key.endsWith("_lost")) return "lost";
  return "open";
}

function DealStageLine({ deal }: { deal: GlanceDeal }) {
  const stageRaw = String(deal.pipelineStage ?? "").trim();
  const stageLabel = stageRaw ? displayStatusLabel(stageRaw) : "No Stage";
  const outcome = stageOutcome(stageRaw);
  const title = deal.title.trim() || "Untitled Deal";

  return (
    <span className="inline-flex max-w-full items-center gap-1.5" data-ff-glance-deal-stage={outcome}>
      <span className="min-w-0 truncate">
        {title}
        <span className="text-muted-foreground"> / </span>
        <span
          className={cn(
            outcome === "won" && "font-medium text-[#16a34a]",
            outcome === "lost" && "font-medium text-[#BF0A30]",
            outcome === "open" && "font-medium text-[#002868]",
          )}
        >
          {stageLabel}
        </span>
      </span>
      {outcome === "won" ? (
        <ThumbsUp className="size-3.5 shrink-0 text-[#16a34a]" aria-label="Closed Won" />
      ) : null}
      {outcome === "lost" ? (
        <ThumbsDown className="size-3.5 shrink-0 text-[#BF0A30]" aria-label="Closed Lost" />
      ) : null}
    </span>
  );
}

function Card({
  label,
  value,
  detail,
  href,
  "data-ff": dataFf,
}: {
  label: string;
  value: string | number;
  detail: ReactNode;
  href?: string;
  "data-ff"?: string;
}) {
  const inner = (
    <>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#002868]">{value}</p>
      <div className="mt-2 line-clamp-3 text-sm leading-snug text-muted-foreground">{detail}</div>
    </>
  );
  const className = cn(
    "rounded-md border border-border bg-muted/20 px-3 py-3 min-h-[6.5rem]",
    href && "transition-colors hover:border-[#002868]/40 hover:bg-muted/40",
  );
  if (href) {
    return (
      <Link href={href} className={className} data-ff={dataFf}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} data-ff={dataFf}>
      {inner}
    </div>
  );
}

function coerceOptOut(value: unknown): boolean {
  if (value === true || value === 1 || value === "1" || value === "true" || value === "on") return true;
  return false;
}

function CommsOkMark({ ok, label }: { ok: boolean; label: string }) {
  // OK = green; opted out / not OK = flag red (whole mark, including label).
  const color = ok ? "#16a34a" : "#BF0A30";
  return (
    <span
      className="inline-flex items-center gap-1 font-semibold"
      style={{ color }}
      data-ff-glance-comms-mark={label.toLowerCase()}
      data-ff-glance-comms-ok={ok ? "1" : "0"}
    >
      <span>{label}:</span>
      {ok ? (
        <>
          <CheckCircle2 className="size-3.5 shrink-0" style={{ color }} aria-hidden />
          <span>OK</span>
        </>
      ) : (
        <>
          <XCircle className="size-3.5 shrink-0" style={{ color }} aria-hidden />
          <span>Opted Out</span>
        </>
      )}
    </span>
  );
}

export function BusinessAtAGlanceCards({
  accountId,
  policies,
  deals,
  activityCount,
  lastActivity,
  emailOptOut = false,
  smsOptOut = false,
}: {
  accountId: string;
  policies: GlancePolicy[];
  deals: GlanceDeal[];
  activityCount: number;
  lastActivity?: GlanceActivity | null;
  emailOptOut?: boolean | string | number | null;
  smsOptOut?: boolean | string | number | null;
}) {
  void accountId;
  const inForce = policies.filter((p) => {
    const s = String(p.status ?? "").toLowerCase();
    return s.includes("force") || s === "active" || s === "bound" || s === "in_force";
  });
  const lines = uniqLines(policies);
  const forceSince = earliestEffective(inForce.length ? inForce : policies);
  const shownDeals = deals.slice(0, 2);
  const lastLabel = lastActivity
    ? [lastActivity.kind, lastActivity.title].filter(Boolean).join(" · ") || "Recent activity"
    : "No activity logged yet";
  const lastWhen = lastActivity?.occurredAt ? formatDay(lastActivity.occurredAt) : null;

  return (
    <div className="space-y-3" data-ff-business-glance-stack="">
    <p
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
      data-ff-glance-comms="status"
    >
      <CommsOkMark ok={!coerceOptOut(emailOptOut)} label="Email" />
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <CommsOkMark ok={!coerceOptOut(smsOptOut)} label="SMS" />
    </p>
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      data-ff-business-glance-cards=""
    >
      <Card
        data-ff="glance-policies"
        label="Policies"
        value={policies.length}
        detail={
          policies.length === 0
            ? "No policies on this business yet."
            : lines.length
              ? `Lines: ${lines.slice(0, 3).join(", ")}${lines.length > 3 ? "…" : ""}`
              : `${policies.length} on book`
        }
        href="#policies"
      />
      <Card
        data-ff="glance-in-force"
        label="In Force"
        value={inForce.length}
        detail={
          inForce.length === 0
            ? "Nothing currently in force."
            : forceSince
              ? `In force since ${formatDay(forceSince)}`
              : `${inForce.length} active ${inForce.length === 1 ? "policy" : "policies"}`
        }
        href="#policies"
      />
      <Card
        data-ff="glance-deals"
        label="Deals"
        value={deals.length}
        detail={
          deals.length === 0 ? (
            "No deals linked yet."
          ) : shownDeals.length ? (
            <span className="flex flex-col gap-1">
              {shownDeals.map((deal) => (
                <DealStageLine key={deal.id} deal={deal} />
              ))}
              {deals.length > shownDeals.length ? (
                <span className="text-xs text-muted-foreground">+{deals.length - shownDeals.length} more</span>
              ) : null}
            </span>
          ) : (
            `${deals.length} linked`
          )
        }
        href="#deals"
      />
      <Card
        data-ff="glance-activity"
        label="Activity"
        value={activityCount}
        detail={lastWhen ? `${lastLabel} · ${lastWhen}` : lastLabel}
        href="#timeline"
      />
    </div>
    </div>
  );
}
