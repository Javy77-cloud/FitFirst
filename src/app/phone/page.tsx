import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DialerStub } from "@/components/phone/dialer-stub";
import { RecordLink } from "@/components/record-links";
import { buttonVariants } from "@/components/ui/button";
import { listCallLog, getTelephonySettings, listContacts } from "@/lib/db/queries";
import { formatPersonName } from "@/lib/crm/display";
import { TELEPHONY_PROVIDER_LABEL, type TelephonyProvider } from "@/lib/domain";
import { formatCallOutcome, phoneLineWallCopy } from "@/lib/desk/phone";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function providerLabel(value: string | null | undefined) {
  if (value && value in TELEPHONY_PROVIDER_LABEL) {
    return TELEPHONY_PROVIDER_LABEL[value as TelephonyProvider];
  }
  return TELEPHONY_PROVIDER_LABEL.none;
}

function relatedHref(row: {
  contact: { id: string } | null;
  business: { id: string } | null;
  policy: { id: string } | null;
  deal: { id: string } | null;
  lead: { id: string } | null;
}) {
  if (row.contact) return `/contacts/${row.contact.id}`;
  if (row.business) return `/accounts/${row.business.id}`;
  if (row.policy) return `/policies/${row.policy.id}`;
  if (row.deal) return `/deals/${row.deal.id}`;
  if (row.lead) return `/leads/${row.lead.id}`;
  return null;
}

function relatedLabel(row: {
  contact: { firstName: string; lastName: string } | null;
  business: { name: string } | null;
  policy: { policyNumber: string } | null;
  deal: { title: string } | null;
  lead: { firstName: string; lastName: string } | null;
}) {
  if (row.contact) return formatPersonName(row.contact);
  if (row.business) return row.business.name;
  if (row.policy) return row.policy.policyNumber;
  if (row.deal) return row.deal.title;
  if (row.lead) return formatPersonName(row.lead);
  return "Desk log";
}

export default async function PhonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, settings, calls, contacts] = await Promise.all([
    searchParams,
    getTelephonySettings(),
    listCallLog(),
    listContacts(),
  ]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const line = {
    connected: Boolean(settings?.connected),
    providerLabel: providerLabel(settings?.provider),
    displayFrom: settings?.displayFrom ?? null,
  };
  const wall = phoneLineWallCopy(line);

  return (
    <AppShell
      title="Phone"
      eyebrow="Desk"
      actions={
        <Link href="/settings/phone" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Phone settings
        </Link>
      }
    >
      <section className="mb-4 rounded-md border border-dashed border-border bg-fit-flag-bg/50 px-4 py-3">
        <h2 className="text-base font-semibold text-navy">{wall.title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{wall.body}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Status: {line.connected ? "connected (stub)" : "not connected"} · {line.providerLabel}
        </p>
      </section>
      {notice === "logged" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Call outcome saved on the activity log. Nothing dialed.
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <DialerStub
          contacts={contacts.map((contact) => ({
            id: contact.id,
            label: formatPersonName(contact),
            phone: contact.phone,
          }))}
        />
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-navy">Call log</h2>
            <p className="text-sm text-muted-foreground">Same activities table as Contact and Policy 360.</p>
          </div>
          {calls.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No calls yet. Use the dialer stub or log a call on a record.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {calls.map(({ activity, contact, business, policy, deal, lead }) => {
                const href = relatedHref({ contact, business, policy, deal, lead });
                const label = relatedLabel({ contact, business, policy, deal, lead });
                return (
                  <li key={activity.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-sm font-medium text-navy">{activity.title}</div>
                      <div className="text-[11px] uppercase text-muted-foreground">
                        {formatCallOutcome(activity.outcome)}
                        {activity.status ? ` · ${activity.status}` : ""}
                      </div>
                    </div>
                    {activity.notes ? (
                      <p className="mt-1 text-sm text-muted-foreground">{activity.notes}</p>
                    ) : null}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {href ? <RecordLink href={href}>{label}</RecordLink> : label}
                      {activity.phoneNumber ? ` · ${activity.phoneNumber}` : ""}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
