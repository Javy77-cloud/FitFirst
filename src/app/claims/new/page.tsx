import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FnolIntakeForm } from "@/components/claims/fnol-form";
import { currentDeskSession } from "@/lib/auth/session";
import { listClaimPartyOptions } from "@/lib/db/claim-queries";

export const dynamic = "force-dynamic";

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ policy?: string; contact?: string }>;
}) {
  const { policy: policyId, contact: contactId } = await searchParams;
  const [{ policies, contacts }, session] = await Promise.all([
    listClaimPartyOptions(),
    currentDeskSession(),
  ]);

  return (
    <AppShell title="FNOL intake">
      <p className="mb-4 text-xs">
        <Link href="/claims" className="text-primary hover:underline">
          Back to claims log
        </Link>
      </p>
      <FnolIntakeForm
        policyId={policyId}
        contactId={contactId}
        policies={policies}
        contacts={contacts}
        postedBy={session.name || "Javy"}
      />
    </AppShell>
  );
}
