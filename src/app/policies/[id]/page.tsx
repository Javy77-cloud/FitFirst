import { notFound } from "next/navigation";
import { uploadDealSlot } from "@/app/actions/lifecycle";
import Link from "next/link";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { ChooseFiles } from "@/components/choose-files";
import { VehiclesList } from "@/components/desk-ams-panels";
import { RecordLink } from "@/components/record-links";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDay, formatMoney } from "@/lib/domain";
import { getPolicyWorkspace } from "@/lib/db/queries";
import { loadPolicyServicing } from "@/lib/ams/queries";
import { ServicingChecklistCard } from "@/components/ams/servicing-checklist";
import { ServiceRequestPanel } from "@/components/ams/service-request-panel";
import { PolicyChangeTimeline } from "@/components/policy/policy-change-timeline";
import { PolicyInformationCard } from "@/components/policy/policy-information";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { RecordContextRail } from "@/components/record-context/record-context-rail";
import { RecordDetailLayout } from "@/components/record-context/record-detail-layout";
import { loadRecordContext } from "@/lib/record-context";

export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const workspace = await getPolicyWorkspace(id);
  if (!workspace) notFound();
  const servicing = await loadPolicyServicing(id);
  const { policy, contact, account, carrier, deal, files, timeline, vehicles, changeLogs, location } =
    workspace;
  const error = typeof query.error === "string" ? query.error : undefined;
  const notice = typeof query.notice === "string" ? query.notice : typeof query.filed === "string" ? query.filed : undefined;
  const isAuto = policy.lineOfBusiness.toUpperCase() === "AUTO";
  const context = await loadRecordContext({
    contactId: contact?.id,
    accountId: account?.id,
    dealId: deal?.id,
    policyId: policy.id,
  });

  return (
    <AppShell title={policy.policyNumber}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <PolicyStatusBadge status={policy.status} />
        <span>{policy.lineOfBusiness}</span>
        <span>{carrier?.name ?? "Carrier TBD"}</span>
        <span>{formatMoney(policy.premium)}</span>
        <span className="text-muted-foreground">
          {formatDay(policy.effectiveDate)} → {formatDay(policy.expirationDate)}
        </span>
      </div>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {contact ? (
          <RecordLink href={`/contacts/${contact.id}`}>
            Contact {contact.lastName}, {contact.firstName}
          </RecordLink>
        ) : null}
        {account ? <RecordLink href={`/accounts/${account.id}`}>Business {account.name}</RecordLink> : null}
        {deal ? <RecordLink href={`/deals/${deal.id}`}>Deal {deal.title}</RecordLink> : null}
        <Link
          href={`/policies/${policy.id}/compare`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Compare renewal
        </Link>
        <Link href="/renewals" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Renewal list
        </Link>
        <Link href="/book-health" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Book health
        </Link>
      </div>

      <RecordDetailLayout
        main={
          <div>
      <PolicyInformationCard
        policy={policy}
        carrierName={carrier?.name}
        contact={contact}
        account={account}
        locationLabel={location?.label ?? location?.address1 ?? location?.street ?? null}
      />
      {isAuto ? <VehiclesList vehicles={vehicles} /> : null}

      {servicing ? <ServicingChecklistCard checklist={servicing.checklist} /> : null}
      <ServiceRequestPanel
        policyId={policy.id}
        status={policy.status}
        coverageA={policy.coverageA}
        premium={policy.premium}
        requests={servicing?.requests ?? []}
        error={error}
        notice={notice}
      />

      <section className="ff-card p-4">
        <h2 className="text-base font-semibold text-navy">Issued policy files</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Dec / complete / ID after bind. Shopping docs (source dec, wind mit, quote PDFs) stay
          on the deal.
        </p>
        <form action={uploadDealSlot} className="my-3 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
          <input type="hidden" name="policyId" value={policy.id} />
          <input type="hidden" name="dealId" value={policy.dealId ?? ""} />
          <input type="hidden" name="slot" value="policy_file" />
          <div>
            <Label className="text-xs">Type</Label>
            <select
              name="docType"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue="policy_dec"
            >
              <option value="policy_dec">Issued dec</option>
              <option value="policy_complete">Complete policy</option>
              <option value="policy_id">ID card</option>
              <option value="aor">AOR packet</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">File</Label>
            <ChooseFiles name="file" required className="mt-1" />
          </div>
          <Button type="submit" size="sm">
            Attach issued file
          </Button>
        </form>
        {files.length === 0 ? (
          <p className="text-base text-muted-foreground">No issued policy files yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td className="font-medium">{file.filename}</td>
                  <td className="uppercase">{file.docType.replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="mt-4 space-y-4">
        <PolicyChangeTimeline logs={changeLogs} />
        <ActivityTimeline
          items={timeline}
          policyId={policy.id}
          contactId={contact?.id}
          accountId={account?.id}
          dealId={deal?.id}
        />
      </div>
          </div>
        }
        rail={
          <RecordContextRail
            context={context}
            policyFacts={{
              number: policy.policyNumber,
              status: policy.status,
              carrier: carrier?.name ?? "Carrier TBD",
              effective: formatDay(policy.effectiveDate),
              expiration: formatDay(policy.expirationDate),
              premium: formatMoney(policy.premium),
            }}
          />
        }
      />
    </AppShell>
  );
}
