import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RenewalQueueActions } from "@/components/ams/renewal-queue-actions";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import {
  RENEWAL_QUEUE_DISCLAIMER,
  RENEWAL_QUEUE_STAGES,
  renewalQueueNextStep,
  renewalQueueStageLabel,
} from "@/lib/domain-ams";
import { listRenewalQueue } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function RenewalQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rows = await listRenewalQueue();
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Renewal queue">
      <p className="mb-3 text-base text-muted-foreground">{RENEWAL_QUEUE_DISCLAIMER}</p>
      <p className="mb-4 text-sm">
        <Link href="/renewals" className="text-primary hover:underline">
          Renewals
        </Link>
        {" · "}
        <Link href="/book-health" className="text-primary hover:underline">
          Book health
        </Link>
        {" · "}
        <Link href="/service-timeline" className="text-primary hover:underline">
          Service timeline
        </Link>
      </p>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-navy">Queue {notice.replaceAll("_", " ")}.</p>
      ) : null}

      {rows.length === 0 ? (
        <section className="ff-card px-4 py-6">
          <p className="text-base text-muted-foreground">No Policies on the renewal queue.</p>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          {RENEWAL_QUEUE_STAGES.map((stage) => {
            const cards = rows.filter(({ queue }) => queue.stage === stage);
            return (
              <section key={stage} className="ff-card overflow-hidden">
                <div className="border-b border-border px-3 py-2">
                  <div className="text-base font-semibold text-navy">
                    {renewalQueueStageLabel(stage)}
                  </div>
                  <p className="text-xs text-muted-foreground">{renewalQueueNextStep(stage)}</p>
                </div>
                {cards.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">Empty.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {cards.map(({ queue, policy, contact, account, carrier }) => (
                      <li key={queue.id} className="space-y-2 px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5 font-medium text-navy">
                          <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {contact
                            ? `${contact.lastName}, ${contact.firstName}`
                            : account?.name ?? "—"}
                          {" · "}
                          {carrier?.name ?? "Carrier TBD"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Expires {formatDay(policy.expirationDate)} · {formatMoney(policy.premium)}
                        </p>
                        {queue.notes ? (
                          <p className="text-sm text-navy">{queue.notes}</p>
                        ) : null}
                        <RenewalQueueActions queueId={queue.id} stage={queue.stage} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
