import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AgentCommissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();
  return (
    <AppShell title="Agent earnings">
      <p className="text-sm text-muted-foreground">
        Per-agent rollup is on the commissions slice. Open{" "}
        <a href="/commissions" className="text-primary hover:underline">
          Commissions
        </a>{" "}
        for pending and paid.
      </p>
    </AppShell>
  );
}
