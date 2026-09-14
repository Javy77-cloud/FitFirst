import { AppShell } from "@/components/app-shell";
import { FnolIntakeForm } from "@/components/claims/fnol-form";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
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

  const policyRow = policyId ? policies.find((row) => row.id === policyId) : null;
  const policyLabel = policyRow
    ? [policyRow.policyNumber, policyRow.party].filter(Boolean).join(" · ") || "Policy"
    : null;
  const contactLabel =
    !policyId && contactId
      ? contacts.find((row) => row.id === contactId)?.label ?? "Contact"
      : null;

  const backLabel = policyId
    ? "Back to policy"
    : contactId
      ? "Back to contact"
      : "Back to claims log";
  const fallbackHref = policyId
    ? `/policies/${policyId}`
    : contactId
      ? `/contacts/${contactId}`
      : "/claims";

  return (
    <AppShell title="FNOL intake">
      <DeskPageTrail
        backLabel={backLabel}
        fallbackHref={fallbackHref}
        crumbs={
          policyId
            ? [
                { href: "/policies", label: "Policies" },
                { href: `/policies/${policyId}`, label: policyLabel ?? "Policy" },
                { label: "Log FNOL" },
              ]
            : contactId
              ? [
                  { href: "/contacts", label: "Contacts" },
                  { href: `/contacts/${contactId}`, label: contactLabel ?? "Contact" },
                  { label: "Log FNOL" },
                ]
              : [
                  { href: "/claims", label: "Claims log" },
                  { label: "Log FNOL" },
                ]
        }
      />
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
