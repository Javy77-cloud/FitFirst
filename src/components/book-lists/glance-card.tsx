import Link from "next/link";
import type { ReactNode } from "react";
import { ClientStatusDot } from "@/components/contacts/client-status-dot";
import { mailtoHref, telHref } from "@/lib/desk/contact-actions";
import type { BookCardAction, BookCardFact, BookGlanceCard } from "@/lib/book-lists/types";
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
    <span className="ff-book-actions" data-ff-book-actions="">
      {actions.map((action) => (
        <a
          key={action.id}
          href={action.href}
          {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {action.label}
        </a>
      ))}
    </span>
  );
}

function FactChips({ facts, className }: { facts: BookCardFact[]; className?: string }) {
  if (facts.length === 0) return null;
  return (
    <ul className={cn("ff-book-facts", className)} data-ff-book-facts="">
      {facts.map((fact) => (
        <li key={fact.id} data-ff-book-fact={fact.id} className={fact.tone ? `is-${fact.tone}` : undefined}>
          {fact.href ? <Link href={fact.href}>{fact.label}</Link> : fact.label}
        </li>
      ))}
    </ul>
  );
}

function ChannelLine({ card }: { card: BookGlanceCard }) {
  if (card.surface !== "contacts" && card.surface !== "accounts") return null;
  const tel = telHref(card.phone);
  const mail = mailtoHref(card.email);
  if (!tel && !mail) return null;
  return (
    <span className="ff-book-channels" data-ff-book-channels="">
      {tel ? <a href={tel}>{card.phone}</a> : null}
      {mail ? <a href={mail}>{card.email}</a> : null}
    </span>
  );
}

function ReachCue({ card }: { card: BookGlanceCard }) {
  const mid = card.mid?.trim() || "";
  if (!mid) return null;
  if (card.midHref) {
    return (
      <Link href={card.midHref} className="ff-stack-mid" data-ff-stack-mid="" data-ff-book-why="" title={card.why}>
        {mid}
      </Link>
    );
  }
  return (
    <p className="ff-stack-mid" data-ff-stack-mid="" data-ff-book-why="" title={card.why}>
      {mid}
    </p>
  );
}

function NameLink({ card }: { card: BookGlanceCard }) {
  return (
    <div className="ff-book-name">
      {card.subtitle && (card.surface === "contacts" || card.surface === "accounts") ? (
        <ClientStatusDot status={card.subtitle} />
      ) : null}
      <Link href={card.href} className="ff-stack-name">
        {card.title}
      </Link>
    </div>
  );
}

function PartyCard({
  card,
  leading,
  extra,
  activity,
  tip,
}: {
  card: BookGlanceCard;
  leading?: ReactNode;
  extra?: ReactNode;
  activity?: ReactNode;
  tip: string;
}) {
  return (
    <article
      className={cn("ff-stack-card ff-book-card ff-party-card", `ff-heat-${card.heat}`)}
      data-ff-book-card={card.id}
      data-hay={card.hay}
      data-ff-book-surface={card.surface}
      data-ff-heat={card.heat}
      data-ff-book-column={card.column}
    >
      {leading}
      <RiskGlyph heat={card.heat} tip={tip} />
      <div className="ff-stack-card-body min-w-0 flex-1">
        <div className="ff-party-line">
          <NameLink card={card} />
          <div className="ff-party-center" data-ff-book-center="">
            <FactChips facts={card.facts ?? []} />
            <ChannelLine card={card} />
          </div>
          <div className="ff-party-right">
            <ReachCue card={card} />
            {activity}
          </div>
        </div>
        {extra}
      </div>
    </article>
  );
}

function CarrierCard({
  card,
  leading,
  extra,
  tip,
}: {
  card: BookGlanceCard;
  leading?: ReactNode;
  extra?: ReactNode;
  tip: string;
}) {
  const columns = card.columns ?? [];
  return (
    <article
      className={cn("ff-stack-card ff-book-card ff-carrier-card", `ff-heat-${card.heat}`)}
      data-ff-book-card={card.id}
      data-hay={card.hay}
      data-ff-book-surface={card.surface}
      data-ff-heat={card.heat}
      data-ff-book-column={card.column}
    >
      {leading}
      <RiskGlyph heat={card.heat} tip={tip} />
      <div className="ff-stack-card-body min-w-0 flex-1">
        <div className="ff-carrier-line">
          <NameLink card={card} />
          <div className="ff-carrier-center" data-ff-book-center="">
            <FactChips facts={card.facts ?? []} />
            <CardActions actions={card.actions ?? []} />
          </div>
          <div className="ff-book-columns ff-carrier-right" data-ff-book-columns="" data-ff-book-why="" title={card.why}>
            {columns.map((column) => (
              <span key={column.id} data-ff-book-column-cue={column.id}>
                {column.label}
              </span>
            ))}
          </div>
        </div>
        {extra}
      </div>
      <Link href={card.primaryAction.href} className="ff-stack-action" data-ff-book-action="">
        {card.primaryAction.label}
      </Link>
    </article>
  );
}

function PolicyStackCard({
  card,
  leading,
  extra,
  tip,
}: {
  card: BookGlanceCard;
  leading?: ReactNode;
  extra?: ReactNode;
  tip: string;
}) {
  return (
    <article
      className={cn("ff-stack-card ff-book-card ff-policy-stack-card", `ff-heat-${card.heat}`)}
      data-ff-book-card={card.id}
      data-ff-policy-stack-card={card.id}
      data-hay={card.hay}
      data-ff-book-surface={card.surface}
      data-ff-heat={card.heat}
      data-ff-book-column={card.column}
    >
      {leading}
      <RiskGlyph heat={card.heat} tip={tip} />
      <div className="ff-stack-card-body min-w-0 flex-1">
        <div className="ff-policy-line">
          <NameLink card={card} />
          <div className="ff-policy-center" data-ff-book-center="">
            <FactChips facts={card.facts ?? []} />
          </div>
        </div>
        {extra}
      </div>
      <Link href={card.primaryAction.href} className="ff-stack-action" data-ff-book-action="">
        {card.primaryAction.label}
      </Link>
    </article>
  );
}

/** Narrow band column — one why line, not the wide stack. */
function BandCard({
  card,
  leading,
  extra,
  tip,
}: {
  card: BookGlanceCard;
  leading?: ReactNode;
  extra?: ReactNode;
  tip: string;
}) {
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
        <NameLink card={card} />
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

export function BookGlanceCardView({
  card,
  leading,
  extra,
  activity,
  layoutMode = "stack",
}: {
  card: BookGlanceCard;
  leading?: ReactNode;
  extra?: ReactNode;
  activity?: ReactNode;
  layoutMode?: "stack" | "bands";
}) {
  const tip = card.health?.why || card.healthHint?.tip || card.why;
  if (card.surface === "contacts" || card.surface === "accounts") {
    return <PartyCard card={card} leading={leading} extra={extra} activity={activity} tip={tip} />;
  }
  if (card.surface === "carriers") {
    return <CarrierCard card={card} leading={leading} extra={extra} tip={tip} />;
  }
  if (card.surface === "policies" && layoutMode === "stack") {
    return <PolicyStackCard card={card} leading={leading} extra={extra} tip={tip} />;
  }
  return <BandCard card={card} leading={leading} extra={extra} tip={tip} />;
}
