import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { RecordLink } from "@/components/record-links";
import { formatDay } from "@/lib/domain";
import { db } from "@/lib/db";
import { claimActivity, claimNotes, claims, contacts, deals, policies } from "@/lib/db/schema";
import { loadRecordContext } from "@/lib/record-context";

export const dynamic = "force-dynamic";

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ claim: claims, policy: policies, contact: contacts, deal: deals })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(deals, eq(policies.dealId, deals.id))
    .where(eq(claims.id, id));
  if (!row) notFound();

  const [notes, events] = await Promise.all([
    db
      .select()
      .from(claimNotes)
      .where(eq(claimNotes.claimId, id))
      .orderBy(desc(claimNotes.createdAt)),
    db
      .select()
      .from(claimActivity)
      .where(eq(claimActivity.claimId, id))
      .orderBy(desc(claimActivity.createdAt)),
  ]);

  const context = await loadRecordContext(
    {
      contactId: row.contact?.id,
      policyId: row.policy?.id,
      dealId: row.deal?.id ?? row.policy?.dealId,
      accountId: row.policy?.accountId,
    },
    {
      conversations: [
        ...notes.map((note) => ({
          id: note.id,
          title: "Claim note",
          body: note.body,
          when: formatDay(note.createdAt),
        })),
        ...events.map((event) => ({
          id: event.id,
          title: event.eventType,
          body: event.body,
          when: formatDay(event.createdAt),
        })),
      ],
    },
  );

  return (
    <AppShell title="Claim" eyebrow="Claims log">
      <RecordDetailLayout
        main={
          <section className="ff-card p-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Status</dt>
                <dd>{row.claim.status}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Cause</dt>
                <dd>{row.claim.causeType ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Carrier claim</dt>
                <dd>{row.claim.carrierClaimNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Policy</dt>
                <dd>
                  {row.policy ? (
                    <RecordLink href={`/policies/${row.policy.id}`}>{row.policy.policyNumber}</RecordLink>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Date of loss</dt>
                <dd>{formatDay(row.claim.dateOfLoss)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Reported</dt>
                <dd>{formatDay(row.claim.dateReported)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase text-muted-foreground">Description</dt>
                <dd className="text-base text-muted-foreground">{row.claim.description ?? "—"}</dd>
              </div>
            </dl>
            {notes.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <h2 className="text-base font-semibold text-navy">Notes</h2>
                <ul className="mt-2 space-y-2">
                  {notes.map((note) => (
                    <li key={note.id} className="text-base text-muted-foreground">
                      {note.body}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        }
        rail={<RecordContextRail context={context} />}
      />
    </AppShell>
  );
}
