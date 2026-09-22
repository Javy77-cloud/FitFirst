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

function isEmptyDash(value: string | null | undefined): boolean {
  const text = value?.trim() ?? "";
  return !text || /^(?:—|–|-|n\/a|na)$/i.test(text);
}

function CardActions({ actions }: { actions: BookCardAction[] }) {
  if (actions.length === 0) return null;
  return (
    <span className="ff-book-actions" data-ff-book-actions="">
      {actions.map((action) => (
        <a
          key={action.id}
          href={action.href}
          title={action.label}
          {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {action.label}
        </a>
      ))}
    </span>
  );
}

function FactChips({ facts, className }: { facts: BookCardFact[]; className?: string }) {
  const shown = facts.filter((fact) => fact.label.trim() && !isEmptyDash(fact.label));
  if (shown.length === 0) return null;
  return (
    <ul className={cn("ff-book-facts", className)} data-ff-book-facts="">
      {shown.map((fact) => (
        <li key={fact.id} data-ff-book-fact={fact.id} className={fact.tone ? `is-${fact.tone}` : undefined} title={fact.label}>
          {fact.href ? <Link href={fact.href}>{fact.label}</Link> : fact.label}
        </li>
      ))}
    </ul>
  );
}

function ChannelLine({ card }: { card: BookGlanceCard }) {
  if (card.surface !== "contacts" && card.surface !== "accounts" && card.surface !== "policies") return null;
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
  if (!mid || isEmptyDash(mid)) return null;
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
  const status =
    card.subtitle && (card.surface === "contacts" || card.surface === "accounts") && !isEmptyDash(card.subtitle)
      ? card.subtitle
      : null;
  return (
    <div className="ff-book-name">
      {status ? <ClientStatusDot status={status} /> : null}
      <Link href={card.href} className="ff-stack-name">
        {card.title}
      </Link>
    </div>
  );
}

function InboxCue({ card }: { card: BookGlanceCard }) {
  if (!card.inboxCue || isEmptyDash(card.inboxCue)) return null;
  return (
    <p className="ff-inbox-cue" data-ff-inbox-cue="">
      {card.inboxHref ? (
        <Link href={card.inboxHref} className="hover:underline">
          {card.inboxCue}
        </Link>
      ) : (
        card.inboxCue
      )}
    </p>
  );
}

function BookGridCard({
  card,
  leading,
  extra,
  activity,
  tip,
  kind,
}: {
  card: BookGlanceCard;
  leading?: ReactNode;
  extra?: ReactNode;
  activity?: ReactNode;
  tip: string;
  kind: "party" | "carrier" | "policy";
}) {
  const columns = (card.columns ?? []).filter((column) => !isEmptyDash(column.label));
  return (
    <article
      className={cn(
        "ff-stack-card ff-book-card ff-book-grid-card",
        kind === "party" && "ff-party-card",
        kind === "carrier" && "ff-carrier-card",
        kind === "policy" && "ff-policy-list-card",
        `ff-heat-${card.heat}`,
      )}
      data-ff-book-card={card.id}
      data-ff-book-grid=""
      data-hay={card.hay}
      data-ff-book-surface={card.surface}
      data-ff-heat={card.heat}
      data-ff-book-column={card.column}
      {...(kind === "policy" ? { "data-ff-policy-list-card": card.id } : {})}
    >
      {leading}
      <RiskGlyph heat={card.heat} tip={tip} />
      <div className="ff-stack-card-body min-w-0 flex-1">
        <div className="ff-book-grid">
          <div className="ff-book-identity" data-ff-book-identity="">
            <NameLink card={card} />
            {kind === "carrier" ? <CardActions actions={card.actions ?? []} /> : <ChannelLine card={card} />}
          </div>
          <div className="ff-book-center" data-ff-book-center="">
            <FactChips facts={card.facts ?? []} />
          </div>
          <div className="ff-book-rail" data-ff-book-rail="">
            {kind === "party" ? <ReachCue card={card} /> : null}
            {kind === "carrier" && columns.length > 0 ? (
              <div className="ff-book-columns" data-ff-book-columns="" data-ff-book-why="" title={card.why}>
                {columns.map((column) => (
                  <span key={column.id} data-ff-book-column-cue={column.id}>
                    {column.label}
                  </span>
                ))}
              </div>
            ) : null}
            {kind !== "party" ? (
              <Link href={card.primaryAction.href} className="ff-stack-action" data-ff-book-action="">
                {card.primaryAction.label}
              </Link>
            ) : null}
            {activity}
          </div>
        </div>
        <InboxCue card={card} />
        {extra}
      </div>
    </article>
  );
}

function policyFact(card: BookGlanceCard, id: string): string {
  const label = card.facts?.find((fact) => fact.id === id)?.label?.trim() ?? "";
  return isEmptyDash(label) ? "" : label;
}

/** Policies Stack — same top-to-bottom card column as Deals/Renewals. Existing facts only. */
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
  const form = policyFact(card, "form") || policyFact(card, "lob");
  const lob = policyFact(card, "lob");
  const number = policyFact(card, "number");
  const line = form && lob && lob !== form ? lob : number;
  const renewal = policyFact(card, "renewal-premium") || policyFact(card, "billing") || policyFact(card, "claims");
  const cells = [
    { id: "form", label: form },
    { id: "carrier", label: policyFact(card, "carrier") },
    { id: "status", label: policyFact(card, "status") },
    { id: "premium", label: policyFact(card, "premium") },
    { id: "line", label: line },
    { id: "expires", label: policyFact(card, "expires") },
    { id: "renews", label: policyFact(card, "renews") },
    { id: "renewal", label: renewal },
  ];
  return (
    <article
      className={cn("ff-stack-card ff-book-card", `ff-heat-${card.heat}`)}
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
        <div className="ff-stack-card-spread ff-policy-stack-spread">
          <div className="ff-policy-stack-identity" data-ff-book-identity="">
            <NameLink card={card} />
            <ChannelLine card={card} />
          </div>
          <div className="ff-policy-stack-center" data-ff-book-center="">
            {cells.map((cell) => (
              <span key={cell.id} className="ff-policy-stack-cell" data-ff-policy-field={cell.id} title={cell.label || undefined}>
                {cell.label}
              </span>
            ))}
          </div>
          <div className="ff-policy-stack-cue" data-ff-book-rail="">
            {card.why && !isEmptyDash(card.why) ? (
              <p className="ff-stack-mid" data-ff-stack-mid="" data-ff-book-why="" title={card.why}>
                {card.why}
              </p>
            ) : null}
            <Link href={card.primaryAction.href} className="ff-stack-action" data-ff-book-action="">
              {card.primaryAction.label}
            </Link>
          </div>
        </div>
        <InboxCue card={card} />
        {extra}
      </div>
    </article>
  );
}

/** Narrow band column — one why line, not the wide list. */
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
        {card.why && !isEmptyDash(card.why) ? (
          <p className="ff-book-why" data-ff-book-why="" title={card.why}>
            {card.why}
          </p>
        ) : null}
        <InboxCue card={card} />
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
  layoutMode?: "stack" | "bands" | "list";
}) {
  const tip = card.health?.why || card.healthHint?.tip || card.why;
  if (card.surface === "contacts" || card.surface === "accounts") {
    return <BookGridCard card={card} leading={leading} extra={extra} activity={activity} tip={tip} kind="party" />;
  }
  if (card.surface === "carriers") {
    return <BookGridCard card={card} leading={leading} extra={extra} tip={tip} kind="carrier" />;
  }
  if (card.surface === "policies" && layoutMode === "stack") {
    return <PolicyStackCard card={card} leading={leading} extra={extra} tip={tip} />;
  }
  if (card.surface === "policies" && layoutMode !== "bands") {
    return <BookGridCard card={card} leading={leading} extra={extra} tip={tip} kind="policy" />;
  }
  return <BandCard card={card} leading={leading} extra={extra} tip={tip} />;
}
