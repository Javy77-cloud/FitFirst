import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FnolIntakeForm } from "@/components/claims/fnol-form";
import { currentDeskSession } from "@/lib/auth/session";
import { listClaimPartyOptions } from "@/lib/db/claim-queries";

export const dynamic = "force-dynamic";

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ policy?: string; contact?: string; error?: string }>;
}) {
  const { policy: policyId, contact: contactId, error } = await searchParams;
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
      {error ? (
        <section className="mb-4 rounded-md border border-fit-red bg-fit-red-bg px-4 py-3 text-sm text-fit-red">
          {error}
        </section>
      ) : null}
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
