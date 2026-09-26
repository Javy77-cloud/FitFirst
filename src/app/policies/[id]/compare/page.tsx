import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ComparePanel } from "@/components/policy/compare-panel";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { getRenewalQueueForPolicy } from "@/lib/ams/queries";
import { getPolicyWorkspace } from "@/lib/db/queries";
import { selectPolicyCompareTerms } from "@/lib/policy/compare-entry";
import { latestRenewalAgreedSnapshot } from "@/lib/renewal/agreed-snapshot";
import { isRenewalHandledStageValue } from "@/lib/renewal/handled";

export const dynamic = "force-dynamic";

export default async function PolicyComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; filed?: string }>;
}) {
  const { id } = await params;
  const { error, filed } = await searchParams;
  const [workspace, renewalQueueRow] = await Promise.all([
    getPolicyWorkspace(id),
    getRenewalQueueForPolicy(id),
  ]);
  if (!workspace) notFound();

  const { policy, contact, carrier, terms, compareLogs } = workspace;
  const renewalHandled = isRenewalHandledStageValue(renewalQueueRow?.stage);
  const frozenSnapshot = latestRenewalAgreedSnapshot(compareLogs);
  const selected = selectPolicyCompareTerms(terms, renewalHandled);
  const current = selected.roleCurrent;
  const proposed = selected.roleProposed;
  const renewedPair = selected.pair.kind === "prior-current";
  const title = `Compare renewal · ${policy.policyNumber}`;
  const policyLabel = policy.policyNumber?.trim() || "Policy";

  return (
    <AppShell title={title}>
      <DeskPageTrail
        backLabel="Back to policy"
        fallbackHref={`/policies/${policy.id}`}
        crumbs={[
          { href: "/policies", label: "Policies" },
          { href: `/policies/${policy.id}`, label: policyLabel },
          { label: "Renew / Compare" },
        ]}
      />
      {error ? (
        <section className="mb-4 rounded-md border border-fit-red bg-fit-red-bg px-4 py-3 text-sm text-fit-red">
          {error}
        </section>
      ) : filed === "compare" ? (
        <section className="mb-4 rounded-md border border-fit-green/40 bg-fit-green-bg px-4 py-3 text-sm text-navy">
          Proposed term saved and logged on this Policy.
        </section>
      ) : null}
      <p className="mb-4 text-base text-muted-foreground">
        {contact ? `${contact.firstName} ${contact.lastName}` : "Client"} · {carrier?.name ?? "carrier"} ·{" "}
        {policy.lineOfBusiness}.
      </p>

      <ComparePanel
        policy={policy}
        current={current}
        proposed={proposed}
        logs={compareLogs}
        compareBaseline={renewedPair ? selected.baseline : undefined}
        compareRenewal={renewedPair ? selected.renewal : undefined}
        baselineLabel={renewedPair ? selected.pair.baselineLabel : undefined}
        renewalLabel={renewedPair ? selected.pair.renewalLabel : undefined}
        renewalHandled={renewalHandled}
        frozenSnapshot={frozenSnapshot}
      />
    </AppShell>
  );
}
