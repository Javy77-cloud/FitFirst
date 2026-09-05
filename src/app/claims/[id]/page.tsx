import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ClaimRecord } from "@/components/claims/claim-record";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { currentDeskSession } from "@/lib/auth/session";
import { getClaimWorkspace } from "@/lib/db/claim-queries";
import { isDeskUuid } from "@/lib/desk-id";
import { formatDay } from "@/lib/domain";
import { loadRecordContext } from "@/lib/record-context";

export const dynamic = "force-dynamic";

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDeskUuid(id)) notFound();
  const [workspace, session] = await Promise.all([getClaimWorkspace(id), currentDeskSession()]);
  if (!workspace) notFound();

  const context = await loadRecordContext(
    {
      contactId: workspace.contact?.id ?? workspace.claim.contactId,
      policyId: workspace.policy?.id ?? workspace.claim.policyId,
      dealId: workspace.policy?.dealId,
      accountId: workspace.account?.id ?? workspace.policy?.accountId,
    },
    {
      conversations: [
        ...workspace.notes.map((note) => ({
          id: note.id,
          title: "Claim note",
          body: note.body,
          when: formatDay(note.createdAt),
        })),
        ...workspace.activity.map((event) => ({
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
        main={<ClaimRecord workspace={workspace} postedBy={session.name || "Javy"} />}
        rail={<RecordContextRail context={context} />}
      />
    </AppShell>
  );
}
