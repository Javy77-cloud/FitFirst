import Link from "next/link";
import type { ReactNode } from "react";
import { ClientStatusDot } from "@/components/contacts/client-status-dot";
import { mailtoHref, telHref } from "@/lib/desk/contact-actions";
import {
  RENEWAL_AGREED_LABEL,
  showRenewalAgreedStamp,
  stackRenewCueText,
} from "@/lib/book-lists/renewal-agreed-stamp";
import { showRenewalAgreedBadge } from "@/lib/book-lists/renewal-agreed";
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

const CARRIER_STACK_COLUMN_IDS = new Set(["portal", "lines", "policies", "status", "last-use"]);

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
  const columns = (card.columns ?? []).filter((column) => {
    if (isEmptyDash(column.label)) return false;
    if (kind === "carrier" && CARRIER_STACK_COLUMN_IDS.has(column.id)) return false;
    return true;
  });
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

const POLICY_STACK_TOP = ["form", "carrier", "status", "premium"] as const;
const POLICY_STACK_BOTTOM = ["number", "expires", "renews", "billing"] as const;

/** Renews / Expires line that sits left of Open. Existing cue text only. */
function policyOpenCue(card: BookGlanceCard): string {
  const bits = (card.why ?? "")
    .split(" · ")
    .map((bit) => bit.trim())
    .filter((bit) => bit && !isEmptyDash(bit) && /^(?:renews|expires|expired|past expiration)\b/i.test(bit));
  const raw = bits.length > 0 ? bits.join(" · ") : policyFact(card, "renews") || policyFact(card, "expires");
  return stackRenewCueText(raw);
}

const CONTACT_STACK_META = ["language", "status", "dob", "policies"] as const;

const CONTACT_STACK_HEADER = [
  ["name", "Name"],
  ["language", "Language"],
  ["status", "Status"],
  ["dob", "DOB"],
  ["policies", "Policies"],
  ["reach", "Reach"],
] as const;

/** Labels only — same tracks as the phone row. No sort controls. */
export function ContactStackColumnHeader() {
  return (
    <div className="ff-contact-stack-header" data-ff-contact-stack-header="" role="row">
      <span className="ff-contact-stack-header-gutter" aria-hidden="true" />
      {CONTACT_STACK_HEADER.map(([id, label]) => (
        <span key={id} data-ff-stack-col={id}>
          {label}
        </span>
      ))}
    </div>
  );
}

const ACCOUNT_STACK_META = ["operations", "contact", "policies", "renewals", "status"] as const;

const ACCOUNT_STACK_HEADER = [
  ["name", "Name"],
  ["operations", "Operations"],
  ["contact", "Attached contact"],
  ["policies", "Policy count"],
  ["renewals", "Renewals"],
  ["status", "Client status"],
  ["reach", "Reach"],
] as const;

const CARRIER_STACK_HEADER = [
  ["name", "Name"],
  ["portal", "Portal"],
  ["lines", "Lines"],
  ["policies", "Policies"],
  ["status", "Status"],
  ["last-use", "Last use"],
  ["open", "Open"],
] as const;

/** Labels only — same tracks as the Carriers Stack card. No sort controls. */
export function CarrierStackColumnHeader() {
  return (
    <div className="ff-carrier-stack-header" data-ff-carrier-stack-header="" role="row">
      <span className="ff-carrier-stack-header-gutter" aria-hidden="true" />
      {CARRIER_STACK_HEADER.map(([id, label]) => (
        <span key={id} data-ff-stack-col={id}>
          {label}
        </span>
      ))}
    </div>
  );
}

/** Labels only — same tracks as the Accounts phone row. No sort controls. */
export function AccountStackColumnHeader() {
  return (
    <div className="ff-account-stack-header" data-ff-account-stack-header="" role="row">
      <span className="ff-account-stack-header-gutter" aria-hidden="true" />
      {ACCOUNT_STACK_HEADER.map(([id, label]) => (
        <span key={id} data-ff-stack-col={id}>
          {label}
        </span>
      ))}
    </div>
  );
}

function plainCell(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  return isEmptyDash(text) ? "" : text;
}

/** Centered dash when phone/email is missing — keeps the field slot visible. */
function EmptyFieldDash() {
  return (
    <span className="ff-stack-empty-dash" data-ff-stack-empty-dash="" aria-hidden="true">
      —
    </span>
  );
}

/** Contacts Stack — three rows: name, phone + meta columns, email + reach. */
function ContactStackCard({
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
  const byId = new Map((card.columns ?? []).map((column) => [column.id, column.label]));
  const meta = CONTACT_STACK_META.map((id) => ({
    id,
    label: plainCell(byId.get(id) ?? (id === "policies" ? "0" : "")),
  }));
  const phone = plainCell(card.phone);
  const email = plainCell(card.email);
  const tel = phone ? telHref(phone) : null;
  const mail = email ? mailtoHref(email) : null;
  const reach = plainCell(card.mid);
  return (
    <article
      className={cn("ff-stack-card ff-book-card ff-party-card ff-contact-stack-card", `ff-heat-${card.heat}`)}
      data-ff-book-card={card.id}
      data-ff-contact-stack-card={card.id}
      data-hay={card.hay}
      data-ff-book-surface={card.surface}
      data-ff-heat={card.heat}
      data-ff-book-column={card.column}
    >
      <div className="ff-stack-card-body min-w-0 flex-1">
        <div className="ff-contact-stack-spread" data-ff-contact-stack="">
          <div className="ff-contact-stack-check" data-ff-contact-stack-check="" data-ff-contact-stack-row="name">
            {leading}
          </div>
          <div className="ff-contact-stack-name-host" data-ff-contact-stack-row="name">
            <Link href={card.href} className="ff-stack-name">
              {card.title}
            </Link>
            {activity ? <span className="ff-contact-stack-heartbeat">{activity}</span> : null}
          </div>
          <span className="ff-contact-stack-glyph" data-ff-contact-stack-glyph="" data-ff-contact-stack-row="phone">
            <RiskGlyph heat={card.heat} tip={tip} />
          </span>
          <span className="ff-contact-stack-phone" data-ff-contact-stack-phone="" data-ff-contact-stack-row="phone">
            {tel ? <a href={tel}>{phone}</a> : <EmptyFieldDash />}
          </span>
          {meta.map((column) => (
            <span
              key={column.id}
              className="ff-contact-stack-col"
              data-ff-contact-stack-col={column.id}
              data-ff-contact-stack-row="phone"
              title={column.label || undefined}
            >
              {column.label}
            </span>
          ))}
          <span className="ff-contact-stack-email" data-ff-contact-stack-email="" data-ff-contact-stack-row="email">
            {mail ? <a href={mail}>{email}</a> : <EmptyFieldDash />}
          </span>
          {reach ? (
            <p
              className="ff-contact-stack-reach"
              data-ff-contact-stack-reach=""
              data-ff-contact-stack-row="email"
              data-ff-stack-mid=""
              title={plainCell(card.why) || undefined}
            >
              {reach}
            </p>
          ) : null}
        </div>
        <InboxCue card={card} />
        {extra}
      </div>
    </article>
  );
}

/** Accounts Stack: same 3-row chrome as Contacts, with account columns on the phone row. */
function AccountStackCard({
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
  const byId = new Map((card.columns ?? []).map((column) => [column.id, column.label]));
  const meta = ACCOUNT_STACK_META.map((id) => ({
    id,
    label: plainCell(byId.get(id) ?? (id === "policies" ? "0" : "")),
  }));
  const phone = plainCell(card.phone);
  const email = plainCell(card.email);
  const tel = phone ? telHref(phone) : null;
  const mail = email ? mailtoHref(email) : null;
  const reach = plainCell(card.mid);
  return (
    <article
      className={cn("ff-stack-card ff-book-card ff-party-card ff-account-stack-card", `ff-heat-${card.heat}`)}
      data-ff-book-card={card.id}
      data-ff-account-stack-card={card.id}
      data-hay={card.hay}
      data-ff-book-surface={card.surface}
      data-ff-heat={card.heat}
      data-ff-book-column={card.column}
    >
      <div className="ff-stack-card-body min-w-0 flex-1">
        <div className="ff-account-stack-spread" data-ff-account-stack="">
          <div className="ff-account-stack-check" data-ff-account-stack-check="" data-ff-account-stack-row="name">
            {leading}
          </div>
          <div className="ff-account-stack-name-host" data-ff-account-stack-row="name">
            <Link href={card.href} className="ff-stack-name">
              {card.title}
            </Link>
            {activity ? <span className="ff-account-stack-heartbeat">{activity}</span> : null}
          </div>
          <span className="ff-account-stack-glyph" data-ff-account-stack-glyph="" data-ff-account-stack-row="phone">
            <RiskGlyph heat={card.heat} tip={tip} />
          </span>
          <span className="ff-account-stack-phone" data-ff-account-stack-phone="" data-ff-account-stack-row="phone">
            {tel ? <a href={tel}>{phone}</a> : <EmptyFieldDash />}
          </span>
          {meta.map((column) => (
            <span
              key={column.id}
              className="ff-account-stack-col"
              data-ff-account-stack-col={column.id}
              data-ff-account-stack-row="phone"
              title={column.label || undefined}
            >
              {column.label}
            </span>
          ))}
          <span className="ff-account-stack-email" data-ff-account-stack-email="" data-ff-account-stack-row="email">
            {mail ? <a href={mail}>{email}</a> : <EmptyFieldDash />}
          </span>
          {reach ? (
            <p
              className="ff-account-stack-reach"
              data-ff-account-stack-reach=""
              data-ff-account-stack-row="email"
              data-ff-stack-mid=""
              title={plainCell(card.why) || undefined}
            >
              {reach}
            </p>
          ) : null}
        </div>
        <InboxCue card={card} />
        {extra}
      </div>
    </article>
  );
}

/** Policies Stack — name, then phone + column tops, then email + column bottoms. */
function PolicyStackCard({
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
  const phone = plainCell(card.phone);
  const email = plainCell(card.email);
  const tel = phone ? telHref(phone) : null;
  const mail = email ? mailtoHref(email) : null;
  const cue = policyOpenCue(card);
  const renewalAgreed = showRenewalAgreedStamp({
    renewalHandled: card.renewalAgreed?.handled,
    renewalDate: card.renewalAgreed?.renewalDate,
    renewedEffective: card.renewalAgreed?.renewedEffective,
    termEffective: card.renewalAgreed?.termEffective,
    termExpiration: card.renewalAgreed?.termExpiration,
    priorExpiration: card.renewalAgreed?.priorExpiration,
    asOf: card.renewalAgreed?.asOf ?? new Date(),
  });
  const cell = (id: string) => {
    const label = policyFact(card, id);
    return (
      <span key={id} className="ff-policy-stack-cell" data-ff-policy-field={id} title={label || undefined}>
        {label}
      </span>
    );
  };
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
      <div className="ff-stack-card-body min-w-0 flex-1">
        <div className="ff-policy-stack-grid" data-ff-policy-stack-grid="">
          <div className="ff-policy-stack-name" data-ff-policy-stack-row="name">
            {leading ? <span className="ff-policy-stack-check">{leading}</span> : null}
            <Link href={card.href} className="ff-stack-name">
              {card.title}
            </Link>
            {activity ? <span className="ff-policy-stack-heartbeat">{activity}</span> : null}
          </div>
          <span className="ff-policy-stack-glyph" data-ff-policy-stack-row="phone">
            <RiskGlyph heat={card.heat} tip={tip} />
          </span>
          <span className="ff-policy-stack-phone" data-ff-policy-stack-phone="">
            {tel ? <a href={tel}>{phone}</a> : <EmptyFieldDash />}
          </span>
          {POLICY_STACK_TOP.map((id) => cell(id))}
          <span className="ff-policy-stack-email" data-ff-policy-stack-row="email" data-ff-policy-stack-email="">
            {mail ? <a href={mail}>{email}</a> : <EmptyFieldDash />}
          </span>
          {POLICY_STACK_BOTTOM.map((id) => cell(id))}
          <div className="ff-policy-stack-open" data-ff-policy-stack-open="">
            <div className="ff-policy-renew-line" data-ff-policy-renew-line="">
              <p className="ff-stack-mid" data-ff-stack-mid="" data-ff-policy-renew-cue="" title={cue || undefined}>
                {cue}
              </p>
              {renewalAgreed ? (
                <span
                  className="ff-deal-status-stamp-ink ff-deal-notice-compact-ink ff-policy-renewal-agreed"
                  data-ff-renewal-agreed=""
                >
                  {RENEWAL_AGREED_LABEL}
                </span>
              ) : null}
            </div>
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

const CARRIER_STACK_CENTER = ["portal", "lines", "policies"] as const;
const CARRIER_STACK_BOTTOM = ["status", "last-use"] as const;

/** Carriers Stack — three rows: name + activity, phone + portal/lines/policies, email + status/last use/open. */
function CarrierStackCard({
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
  const byId = new Map((card.columns ?? []).map((column) => [column.id, column.label]));
  const phone = plainCell(card.phone);
  const email = plainCell(card.email);
  const tel = phone ? telHref(phone) : null;
  const mail = email ? mailtoHref(email) : null;
  const portalAction = (card.actions ?? []).find((action) => action.id === "portal");
  const cell = (id: string, row: "phone" | "email") => {
    const label = plainCell(byId.get(id));
    const portalLink = id === "portal" && portalAction && label === "Portal";
    return (
      <span
        key={id}
        className="ff-carrier-stack-col"
        data-ff-carrier-stack-col={id}
        data-ff-carrier-stack-row={row}
        title={label || undefined}
      >
        {portalLink ? (
          <a href={portalAction.href} target="_blank" rel="noreferrer">
            {label}
          </a>
        ) : (
          label
        )}
      </span>
    );
  };
  return (
    <article
      className={cn("ff-stack-card ff-book-card ff-carrier-card ff-carrier-stack-card", `ff-heat-${card.heat}`)}
      data-ff-book-card={card.id}
      data-ff-carrier-stack-card={card.id}
      data-hay={card.hay}
      data-ff-book-surface={card.surface}
      data-ff-heat={card.heat}
      data-ff-book-column={card.column}
    >
      <div className="ff-stack-card-body min-w-0 flex-1">
        <div className="ff-carrier-stack-spread" data-ff-carrier-stack="">
          <div className="ff-carrier-stack-check" data-ff-carrier-stack-check="" data-ff-carrier-stack-row="name">
            {leading}
          </div>
          <div className="ff-carrier-stack-name" data-ff-carrier-stack-row="name">
            <Link href={card.href} className="ff-stack-name">
              {card.title}
            </Link>
            {activity ? (
              <span className="ff-carrier-stack-heartbeat" data-ff-carrier-stack-heartbeat="">
                {activity}
              </span>
            ) : null}
          </div>
          <span className="ff-carrier-stack-glyph" data-ff-carrier-stack-glyph="" data-ff-carrier-stack-row="phone">
            <RiskGlyph heat={card.heat} tip={tip} />
          </span>
          <span className="ff-carrier-stack-phone" data-ff-carrier-stack-phone="" data-ff-carrier-stack-row="phone">
            {tel ? <a href={tel}>{phone}</a> : <EmptyFieldDash />}
          </span>
          {CARRIER_STACK_CENTER.map((id) => cell(id, "phone"))}
          <span className="ff-carrier-stack-email" data-ff-carrier-stack-email="" data-ff-carrier-stack-row="email">
            {mail ? <a href={mail}>{email}</a> : <EmptyFieldDash />}
          </span>
          {CARRIER_STACK_BOTTOM.map((id) => cell(id, "email"))}
          <div className="ff-carrier-stack-open" data-ff-carrier-stack-open="" data-ff-carrier-stack-row="email">
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

/** Current-band Client staying policies only. The helper clears it on the renewal effective date. */
function showRenewalAgreedCorner(card: BookGlanceCard): boolean {
  if (card.surface !== "policies" || card.column !== "current" || !card.renewalAgreed) return false;
  return showRenewalAgreedBadge(card.renewalAgreed);
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
  const renewalAgreed = showRenewalAgreedCorner(card);
  return (
    <article
      className={cn("ff-stack-card ff-book-card", `ff-heat-${card.heat}`, renewalAgreed && "is-renewal-agreed")}
      data-ff-book-card={card.id}
      data-hay={card.hay}
      data-ff-book-surface={card.surface}
      data-ff-heat={card.heat}
      data-ff-book-column={card.column}
    >
      {renewalAgreed ? (
        <span className="ff-renewal-agreed-badge" data-ff-renewal-agreed="">
          {RENEWAL_AGREED_LABEL}
        </span>
      ) : null}
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
  if (card.surface === "contacts") {
    return (
      <ContactStackCard card={card} leading={leading} extra={extra} activity={activity} tip={tip} />
    );
  }
  if (card.surface === "accounts" && layoutMode === "stack") {
    return (
      <AccountStackCard card={card} leading={leading} extra={extra} activity={activity} tip={tip} />
    );
  }
  if (card.surface === "accounts") {
    return <BookGridCard card={card} leading={leading} extra={extra} activity={activity} tip={tip} kind="party" />;
  }
  if (card.surface === "carriers" && layoutMode === "stack") {
    return (
      <CarrierStackCard card={card} leading={leading} extra={extra} activity={activity} tip={tip} />
    );
  }
  if (card.surface === "carriers") {
    return <BookGridCard card={card} leading={leading} extra={extra} tip={tip} kind="carrier" />;
  }
  if (card.surface === "policies" && layoutMode === "stack") {
    return <PolicyStackCard card={card} leading={leading} extra={extra} activity={activity} tip={tip} />;
  }
  if (card.surface === "policies" && layoutMode !== "bands") {
    return <BookGridCard card={card} leading={leading} extra={extra} tip={tip} kind="policy" />;
  }
  return <BandCard card={card} leading={leading} extra={extra} tip={tip} />;
}
