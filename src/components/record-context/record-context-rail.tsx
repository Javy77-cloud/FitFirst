"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Mail, Phone } from "lucide-react";
import {
  groupOpenActivities,
  type RailPerson,
  type RecordContextPayload,
} from "@/lib/record-context-types";
import { ACTIVITY_KIND_LABEL, type ActivityKind } from "@/lib/domain";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { cn } from "@/lib/utils";

export type RailPolicyFacts = {
  number: string;
  status: string;
  carrier: string;
  effective: string;
  expiration: string;
  premium: string;
};

function initials(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || "—";
}

function kindLabel(kind: string): string {
  return ACTIVITY_KIND_LABEL[kind as ActivityKind] ?? kind.replaceAll("_", " ");
}

function DealStage({ stage }: { stage: string }) {
  const hot = stage === "quote_sent" || stage === "bound" || stage === "won" || stage === "closed_won";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize text-white",
        hot ? "bg-fit-green" : "bg-navy",
      )}
    >
      {stage.replaceAll("_", " ")}
    </span>
  );
}

export function RecordContextRail({
  context,
  policyFacts,
}: {
  context: RecordContextPayload;
  policyFacts?: RailPolicyFacts;
}) {
  const [tab, setTab] = useState<"info" | "conversations">("info");
  const [personKey, setPersonKey] = useState(context.people[0]?.key ?? "");
  const [openKind, setOpenKind] = useState<string | null>(null);
  const person = context.people.find((row) => row.key === personKey) ?? context.people[0] ?? null;
  const groups = useMemo(() => groupOpenActivities(context.openActivities), [context.openActivities]);
  const expanded = openKind ?? groups.find((g) => g.items.length > 0)?.kind ?? null;

  return (
    <div className="ff-card overflow-hidden">
      {context.people.length > 1 ? (
        <div className="border-b border-border px-3 py-2">
          <label className="sr-only" htmlFor="rail-person">
            Related person
          </label>
          <select
            id="rail-person"
            value={person?.key ?? ""}
            onChange={(event) => setPersonKey(event.target.value)}
            className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-navy"
          >
            {context.people.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label} · {row.kindLabel}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex border-b border-border px-3">
        {(
          [
            ["info", "Info"],
            ["conversations", "Conversations"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "mr-4 border-b-2 py-2 text-sm font-semibold",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-navy",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "conversations" ? (
        <Conversations conversations={context.conversations} />
      ) : (
        <div>
          {policyFacts ? <PolicyFactsCard facts={policyFacts} /> : null}
          <PersonCard person={person} />

          <section className="border-t border-border px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">Deal summary</h3>
              <Link href={context.newDealHref} className="text-sm font-medium text-primary hover:underline">
                + New
              </Link>
            </div>
            {context.deals.length === 0 ? (
              <p className="text-base text-muted-foreground">No linked deal.</p>
            ) : (
              <ul className="space-y-2">
                {context.deals.slice(0, 4).map((deal) => (
                  <li key={deal.id}>
                    <Link href={deal.href} className="text-sm font-medium text-primary hover:underline">
                      {deal.title}
                    </Link>
                    <div className="mt-1">
                      <DealStage stage={deal.stage} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {context.policies.length > 0 ? (
            <section className="border-t border-border px-3 py-3">
              <h3 className="mb-2 text-sm font-semibold text-navy">Policies</h3>
              <ul className="space-y-1.5">
                {context.policies.slice(0, 4).map((policy) => (
                  <li key={policy.id} className="flex items-center justify-between gap-2">
                    <Link href={policy.href} className="text-sm font-medium text-primary hover:underline">
                      {policy.number}
                    </Link>
                    <PolicyStatusBadge status={policy.status} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="border-t border-border px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy">Open activities</h3>
              <Link href={context.newActivityHref} className="text-sm font-medium text-primary hover:underline">
                + New
              </Link>
            </div>
            <ul className="space-y-1.5">
              {groups.map((group) => {
                const open = expanded === group.kind;
                return (
                  <li key={group.kind} className="overflow-hidden rounded-md bg-muted">
                    <button
                      type="button"
                      onClick={() => setOpenKind(open ? "" : group.kind)}
                      className="flex w-full items-center justify-between px-2.5 py-2 text-left text-sm"
                    >
                      <span className="font-medium text-navy">{kindLabel(group.kind)}</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <span className="rounded-sm bg-card px-1.5 text-caption font-semibold">{group.items.length}</span>
                        <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
                      </span>
                    </button>
                    {open ? (
                      <ul className="border-t border-border/70 px-2.5 py-1.5">
                        {group.items.length === 0 ? (
                          <li className="py-1 text-base text-muted-foreground">None open</li>
                        ) : (
                          group.items.map((item) => (
                            <li key={item.id} className="py-1">
                              <Link href={item.href} className="text-sm text-primary hover:underline">
                                {item.title}
                              </Link>
                              {item.when && item.when !== "—" ? (
                                <div className="text-helper text-muted-foreground">{item.when}</div>
                              ) : null}
                            </li>
                          ))
                        )}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function PolicyFactsCard({ facts }: { facts: RailPolicyFacts }) {
  return (
    <section className="border-b border-border px-3 py-3">
      <h3 className="mb-2 text-sm font-semibold text-navy">This policy</h3>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-navy">{facts.number}</span>
        <PolicyStatusBadge status={facts.status} />
      </div>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Carrier</dt>
          <dd className="text-right font-medium text-navy">{facts.carrier}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Effective</dt>
          <dd className="text-right font-medium text-navy">{facts.effective}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Expires</dt>
          <dd className="text-right font-medium text-navy">{facts.expiration}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Premium</dt>
          <dd className="text-right font-medium text-navy">{facts.premium}</dd>
        </div>
      </dl>
    </section>
  );
}

function PersonCard({ person }: { person: RailPerson | null }) {
  if (!person) {
    return (
      <div className="px-3 py-4">
        <p className="text-base text-muted-foreground">
          No contact or lead on this record. Link one to fill the rail.
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-navy">
          {initials(person.label)}
        </div>
        <div className="min-w-0">
          <div className="text-caption uppercase tracking-wide text-muted-foreground">{person.kindLabel}</div>
          <Link href={person.href} className="text-base font-semibold text-primary hover:underline">
            {person.label}
          </Link>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {person.email ? (
          <a
            href={`mailto:${person.email}`}
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Send Email
          </a>
        ) : (
          <span className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-muted-foreground">
            No email
          </span>
        )}
        {person.phone ? (
          <a
            href={`tel:${person.phone}`}
            className="inline-flex h-8 items-center rounded-md border border-input bg-card px-3 text-sm font-medium text-navy"
          >
            Call
          </a>
        ) : (
          <span className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-muted-foreground">
            No phone
          </span>
        )}
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <Phone className="size-3.5 text-muted-foreground" />
          {person.phone ? (
            <a href={`tel:${person.phone}`} className="text-navy hover:underline">
              {person.phone}
            </a>
          ) : (
            <span className="text-muted-foreground">No phone</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Mail className="size-3.5 text-muted-foreground" />
          {person.email ? (
            <a href={`mailto:${person.email}`} className="truncate text-navy hover:underline">
              {person.email}
            </a>
          ) : (
            <span className="text-muted-foreground">No email</span>
          )}
        </div>
      </dl>
      <Link href={person.href} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        More Info
      </Link>
    </div>
  );
}

function Conversations({ conversations }: { conversations: RecordContextPayload["conversations"] }) {
  if (conversations.length === 0) {
    return <p className="px-3 py-6 text-base text-muted-foreground">No conversations on this record.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {conversations.map((item) => (
        <li key={item.id} className="px-3 py-3">
          <div className="text-sm font-medium text-navy">{item.title}</div>
          <p className="mt-0.5 text-base text-muted-foreground">{item.body}</p>
          <div className="mt-1 text-helper text-muted-foreground">{item.when}</div>
        </li>
      ))}
    </ul>
  );
}
