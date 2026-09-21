import Link from "next/link";
import type { ReactNode } from "react";
import { ClientStatusDot } from "@/components/contacts/client-status-dot";
import { mailtoHref, telHref } from "@/lib/desk/contact-actions";
import type { BookCardAction, BookGlanceCard } from "@/lib/book-lists/types";
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

function CardActions({ actions }: { actions: BookCardAction[] }) {
  if (actions.length === 0) return null;
  return (
    <p className="ff-book-actions" data-ff-book-actions="">
      {actions.map((action) => (
        <a
          key={action.id}
          href={action.href}
          {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {action.label}
        </a>
      ))}
    </p>
  );
}

function ChannelLine({ card }: { card: BookGlanceCard }) {
  if (card.surface !== "contacts" && card.surface !== "accounts") return null;
  const tel = telHref(card.phone);
  const mail = mailtoHref(card.email);
  if (!tel && !mail) return null;
  return (
    <p className="ff-book-channels" data-ff-book-channels="">
      {tel ? <a href={tel}>{card.phone}</a> : null}
      {mail ? <a href={mail}>{card.email}</a> : null}
    </p>
  );
}

export function BookGlanceCardView({
  card,
  leading,
  extra,
  activity,
}: {
  card: BookGlanceCard;
  leading?: ReactNode;
  extra?: ReactNode;
  activity?: ReactNode;
}) {
  const tip = card.health?.why || card.healthHint?.tip || card.why;
  const mid = card.mid?.trim() || "";
  const showPill = !activity && !(card.actions && card.actions.length > 0);
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
      <div className="ff-stack-card-body min-w-0 flex-1">
        {mid ? (
          <div className="ff-stack-card-spread">
            <div className="flex min-w-0 items-center gap-1.5">
              {card.subtitle ? <ClientStatusDot status={card.subtitle} /> : null}
              <Link href={card.href} className="ff-stack-name">
                {card.title}
              </Link>
            </div>
            {card.midHref ? (
              <Link href={card.midHref} className="ff-stack-mid" data-ff-stack-mid="" data-ff-book-why="" title={card.why}>
                {mid}
              </Link>
            ) : (
              <p className="ff-stack-mid" data-ff-stack-mid="" data-ff-book-why="" title={card.why}>
                {mid}
              </p>
            )}
            {activity}
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            {card.subtitle ? <ClientStatusDot status={card.subtitle} /> : null}
            <Link
              href={card.href}
              className="block min-w-0 truncate text-sm font-semibold text-navy hover:text-primary hover:underline"
            >
              {card.title}
            </Link>
          </div>
        )}
        {card.peek ? (
          <p className="ff-book-peek" data-ff-book-peek="">
            {card.peek}
          </p>
        ) : null}
        <ChannelLine card={card} />
        <CardActions actions={card.actions ?? []} />
        {mid ? null : (
          <p className="ff-book-why" data-ff-book-why="" title={card.why}>
            {card.why}
          </p>
        )}
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
      {showPill ? (
        <Link href={card.primaryAction.href} className="ff-stack-action" data-ff-book-action="">
          {card.primaryAction.label}
        </Link>
      ) : null}
    </article>
  );
}
