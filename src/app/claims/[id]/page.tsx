import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ClaimRecord } from "@/components/claims/claim-record";
import { currentDeskSession } from "@/lib/auth/session";
import { getClaimWorkspace } from "@/lib/db/claim-queries";
import { isUuid } from "@/lib/ids";

export const dynamic = "force-dynamic";

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [workspace, session] = await Promise.all([getClaimWorkspace(id), currentDeskSession()]);
  if (!workspace) notFound();

  const party = workspace.contact
    ? `${workspace.contact.lastName}, ${workspace.contact.firstName}`
    : workspace.policy?.policyNumber ?? "Claim";

  return (
    <AppShell title={party} eyebrow="Claims log">
      <p className="mb-4 text-xs">
        <Link href="/claims" className="text-primary hover:underline">
          Back to claims log
        </Link>
      </p>
      <ClaimRecord workspace={workspace} postedBy={session.name || "Javy"} />
    </AppShell>
  );
}
