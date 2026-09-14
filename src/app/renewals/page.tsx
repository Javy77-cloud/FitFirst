import { and, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { RenewalsDesk } from "@/components/renewals/renewals-desk";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { policies } from "@/lib/db/schema";
import { requireSignedIn } from "@/lib/auth/guards";
import { getAgentPolicyAccess } from "@/lib/policy/agent-policy-access-prefs";
import { resolvePolicyViewerAccess } from "@/lib/policy/agent-policy-access";

export const dynamic = "force-dynamic";

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const params = await searchParams;
  const agentAccess = await getAgentPolicyAccess();
  const viewer = resolvePolicyViewerAccess(Boolean(session.isAdmin), agentAccess);
  const policyIdParam = typeof params.policy === "string" ? params.policy : undefined;

  const policyRow = policyIdParam
    ? await db
        .select({
          id: policies.id,
          policyNumber: policies.policyNumber,
        })
        .from(policies)
        .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyIdParam)))
        .then((rows) => rows[0] ?? null)
        .catch(() => null)
    : null;

  const policyCrumbLabel = policyRow?.policyNumber?.trim() || "Policy";

  return (
    <AppShell title="Renewals">
      <DeskPageTrail
        backLabel={policyIdParam ? "Back to policy" : "Back"}
        fallbackHref={policyIdParam ? `/policies/${policyIdParam}` : "/policies"}
        crumbs={[
          { href: "/policies", label: "Policies" },
          ...(policyIdParam
            ? [{ href: `/policies/${policyIdParam}`, label: policyCrumbLabel }]
            : []),
          { label: "Renewals" },
        ]}
      />
      <RenewalsDesk searchParams={params} canEditStages={session.isAdmin} canDrag={viewer.renewalPipelineDrag.write} />
    </AppShell>
  );
}
