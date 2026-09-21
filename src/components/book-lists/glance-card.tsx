import Link from "next/link";
import type { ReactNode } from "react";
import { ClientStatusDot } from "@/components/contacts/client-status-dot";
import type { BookGlanceCard } from "@/lib/book-lists/types";
import { cn } from "@/lib/utils";

function RiskGlyph({
  heat,
  tip,
}: {
  heat: BookGlanceCard["heat"];
  tip: string;
}) {
  return (
    <span
      className={cn("ff-stack-glyph", `ff-heat-${heat}`)}
      aria-hidden
      title={tip}
      data-ff-stack-glyph={heat}
    />
  );
}

export function BookGlanceCardView({
  card,
  leading,
  extra,
}: {
  card: BookGlanceCard;
  leading?: ReactNode;
  extra?: ReactNode;
}) {
  const tip = card.health?.why || card.healthHint?.tip || card.why;
  return (
    <article
      className={cn("ff-stack-card ff-book-card", `ff-heat-${card.heat}`)}
      data-ff-book-card={card.id}
      data-hay={card.hay}
      data-ff-book-surface={card.surface}
      data-ff-heat={card.heat}
      data-ff-book-column={card.column}
    >
      {leading}
      <RiskGlyph heat={card.heat} tip={tip} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {card.subtitle ? <ClientStatusDot status={card.subtitle} /> : null}
          <Link
            href={card.href}
            className="block min-w-0 truncate text-sm font-semibold text-navy hover:text-primary hover:underline"
          >
            {card.title}
          </Link>
        </div>
        <p className="ff-book-why" data-ff-book-why="" title={card.why}>
          {card.why}
        </p>
        {card.inboxCue ? (
          <p className="ff-inbox-cue" data-ff-inbox-cue="">
            {card.inboxHref ? (
              <Link href={card.inboxHref} className="hover:underline">
                {card.inboxCue}
              </Link>
            ) : (
              card.inboxCue
            )}
          </p>
        ) : null}
        {extra}
      </div>
      <Link href={card.primaryAction.href} className="ff-stack-action" data-ff-book-action="">
        {card.primaryAction.label}
      </Link>
    </article>
  );
}
