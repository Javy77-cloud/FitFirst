import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ComparePanel } from "@/components/policy/compare-panel";
import { buttonVariants } from "@/components/ui/button";
import { getPolicyWorkspace } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PolicyComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getPolicyWorkspace(id);
  if (!workspace) notFound();

  const { policy, contact, carrier, terms, compareLogs } = workspace;
  const current = terms.find((term) => term.role === "current");
  const proposed = terms.find((term) => term.role === "proposed");
  const title = `Compare renewal · ${policy.policyNumber}`;

  return (
    <AppShell
      title={title}
      actions={
        <Link href={`/policies/${policy.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
          Back to policy
        </Link>
      }
    >
      <p className="mb-4 text-base text-muted-foreground">
        Current term vs the carrier&apos;s proposed term. Premium change is dollars and percent —
        not a rater score. {contact ? `${contact.firstName} ${contact.lastName}` : "Client"} ·{" "}
        {carrier?.name ?? "carrier"} · {policy.lineOfBusiness}.
      </p>

      <ComparePanel policy={policy} current={current} proposed={proposed} logs={compareLogs} />
    </AppShell>
  );
}
