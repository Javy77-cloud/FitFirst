import Link from "next/link";
import { Lock } from "lucide-react";
import type { SocialPulseCard } from "@/lib/social/pulse";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { TrendSpark } from "./trend-spark";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function PulseTile({
  card,
  index = 0,
  framed = true,
  compact = false,
}: {
  card: SocialPulseCard;
  index?: number;
  framed?: boolean;
  compact?: boolean;
}) {
  return (
    <article
      data-platform={card.id}
      data-connected={card.connected ? "true" : "false"}
      data-locked={card.locked ? "true" : "false"}
      className={framed ? "ff-card flex h-full flex-col p-3" : "flex h-full flex-col p-3"}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span
            aria-hidden
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] font-semibold text-navy"
          >
            {card.initials}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-navy">{card.name}</h3>
            {card.accountLabel ? (
              <p className="truncate text-[11px] text-muted-foreground">{card.accountLabel}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {card.locked ? "Locked for agents" : card.connected ? "Connected stub" : "Not connected"}
              </p>
            )}
          </div>
        </div>
        {card.locked ? (
          <span className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            <Lock className="size-3" />
            Locked
          </span>
        ) : (
          <ConnectionBadge connected={card.connected} />
        )}
      </div>

      {card.locked ? (
        <p className="mt-2 text-xs text-muted-foreground">{card.lockReason}</p>
      ) : card.metrics ? (
        <>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {card.id === "google_business_profile" ? "Viewers" : "Followers"}
              </dt>
              <dd className="text-base font-semibold tabular-nums text-navy">{fmt(card.metrics.followers)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Engagement</dt>
              <dd className="text-base font-semibold tabular-nums text-navy">{card.metrics.engagementPct}%</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Views</dt>
              <dd className="text-base font-semibold tabular-nums text-navy">{fmt(card.metrics.views)}</dd>
            </div>
          </dl>
          {!compact ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <TrendSpark
                values={card.metrics.followerTrend}
                label={card.id === "google_business_profile" ? "Viewer trend" : "Follower trend"}
                colorIndex={index}
              />
              <TrendSpark values={card.metrics.viewsTrend} label="Views trend" colorIndex={index + 1} />
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Connect in Settings → Social. Paste the agency’s free developer app, or mark a desk demo.
        </p>
      )}
    </article>
  );
}

export function PulseCards({
  cards,
  compact = false,
}: {
  cards: SocialPulseCard[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "grid gap-2 sm:grid-cols-2" : "grid gap-3 md:grid-cols-2 xl:grid-cols-3"}>
      {cards.map((card, index) => (
        <PulseTile key={card.id} card={card} index={index} compact={compact} />
      ))}
      {compact ? (
        <p className="sm:col-span-2 text-[11px] text-muted-foreground">
          Demo seed numbers after a connect stub.{" "}
          <Link href="/social" className="text-primary hover:underline">
            Open social pulse
          </Link>
        </p>
      ) : null}
    </div>
  );
}
