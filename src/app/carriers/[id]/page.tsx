import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AskOnRecord } from "@/components/record-ask";
import { formatMoney } from "@/lib/domain";
import { getCarrier } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CarrierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getCarrier(id);
  if (!row) notFound();
  const { carrier, rule } = row;

  return (
    <AppShell title={carrier.name}>
      <p className="mb-3 text-sm text-muted-foreground">
        Appetite card only. Ask a teammate stays in-desk. Nothing writes live Zoho.
      </p>
      <section className="ff-card mb-4 max-w-xl space-y-2 p-4 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">Portal</span>
          <div className="uppercase">{carrier.portalStatus.replaceAll("_", " ")}</div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Lines</span>
          <div>{(carrier.writtenLines ?? []).join(", ") || "—"}</div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Cov A range</span>
          <div>
            {rule ? `${formatMoney(rule.minCovA)} – ${formatMoney(rule.maxCovA)}` : "—"}
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Don&apos;t write</span>
          <p className="text-muted-foreground">{carrier.dontWriteNotes ?? "—"}</p>
        </div>
      </section>
      <AskOnRecord entityType="carrier" entityId={carrier.id} />
    </AppShell>
  );
}
