import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCarrierContact } from "@/app/actions/pipeline-admin";
import { AppShell } from "@/components/app-shell";
import { RecordSection } from "@/components/record-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/domain";
import { getCarrier, listRecordAsks } from "@/lib/db/queries";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { currentDeskSession } from "@/lib/auth/session";
import { RecordAskPanel } from "@/components/record-ask";

export const dynamic = "force-dynamic";

export default async function CarrierRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row, asks, users, session] = await Promise.all([
    getCarrier(id),
    listRecordAsks("carrier", id),
    listDeskUsers(),
    currentDeskSession(),
  ]);
  if (!row) notFound();
  const { carrier, rule } = row;

  return (
    <AppShell title={carrier.name}>
      <RecordSection id="record" title="This carrier" summary="Portal, phones, and notes">
        {session.isAdmin ? (
          <form action={updateCarrierContact} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="carrierId" value={carrier.id} />
            <div>
              <Label className="text-xs">Portal URL</Label>
              <Input name="portalUrl" defaultValue={carrier.portalUrl ?? ""} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Website</Label>
              <Input name="website" defaultValue={carrier.website ?? ""} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Customer service</Label>
              <Input name="customerServicePhone" defaultValue={carrier.customerServicePhone ?? ""} className="mt-1 h-8" />
            </div>
            <div>
              <Label className="text-xs">Agent phone</Label>
              <Input name="agentPhone" defaultValue={carrier.agentPhone ?? ""} className="mt-1 h-8" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Carrier info</Label>
              <Textarea name="carrierInfo" defaultValue={carrier.carrierInfo ?? ""} className="mt-1 min-h-20" />
            </div>
            <Button type="submit" size="sm">
              Save carrier
            </Button>
          </form>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Customer service</dt>
              <dd>{carrier.customerServicePhone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Agent phone</dt>
              <dd>{carrier.agentPhone ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Info</dt>
              <dd>{carrier.carrierInfo ?? carrier.dontWriteNotes ?? "—"}</dd>
            </div>
          </dl>
        )}
        <RecordAskPanel entityType="carrier" entityId={carrier.id} asks={asks} users={users} />
      </RecordSection>
      <RecordSection id="related" title="Related" summary="Appetite drill-in and decline log">
        <p className="mb-3 text-sm">
          <Link href="/logs" className="text-primary hover:underline">
            Decline log
          </Link>
        </p>
        {rule ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Cov A</dt>
              <dd>
                {formatMoney(rule.minCovA)} – {formatMoney(rule.maxCovA)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Roof / coast / mobile</dt>
              <dd>
                max roof {rule.maxRoofAge ?? "—"}y · coast {rule.minMilesToCoast ?? 0}+ mi · mobile{" "}
                {rule.mobileAllowed ? "yes" : "no"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No appetite rule on this carrier.</p>
        )}
      </RecordSection>
    </AppShell>
  );
}
