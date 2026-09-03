import { notFound } from "next/navigation";
import { uploadDealSlot } from "@/app/actions/lifecycle";
import { updatePolicyRecord } from "@/app/actions/policy-record";
import Link from "next/link";
import { ActivityTimeline } from "@/components/activity-timeline";
import { AppShell } from "@/components/app-shell";
import { VehiclesList } from "@/components/desk-ams-panels";
import { RecordLink } from "@/components/record-links";
import { RecordSection } from "@/components/record-section";
import { dayInput } from "@/components/related-tables";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, SELLING_AGENCIES } from "@/lib/domain";
import { getPolicyWorkspace, listEmailTemplates, listRecordAsks, sumCommissionsForPolicies } from "@/lib/db/queries";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { RecordAskPanel } from "@/components/record-ask";
import { RelatedRollups } from "@/components/related-tables";
import { inferLineFamily, LINE_FAMILIES, LINE_FAMILY_LABEL, previewCommission } from "@/lib/desk/commission-line";
import { partyLabel, policyRecordName } from "@/lib/desk/policy-name";
import { toNumber } from "@/lib/commissions/math";

export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workspace, templates, asks, users] = await Promise.all([
    getPolicyWorkspace(id),
    listEmailTemplates(),
    listRecordAsks("policy", id),
    listDeskUsers(),
  ]);
  if (!workspace) notFound();
  const { policy, contact, account, carrier, deal, files, timeline, vehicles } = workspace;
  const isAuto = policy.lineOfBusiness.toUpperCase() === "AUTO";
  const displayName = policyRecordName({
    contactName: partyLabel(contact, null) || null,
    businessName: account?.name,
    subType: policy.policySubType,
    lineOfBusiness: policy.lineOfBusiness,
    formType: policy.formType,
    carrierName: carrier?.name,
    effectiveDate: policy.effectiveDate,
  });
  const family = inferLineFamily(policy.lineOfBusiness, policy.commissionFamily, policy.policySubType);
  const preview = previewCommission({
    family,
    gwp: toNumber(policy.premium),
    commission4: policy.commission4Pct ? toNumber(policy.commission4Pct) : null,
    frequency: policy.billingFrequency,
    insuredCount: policy.insuredCount ?? 1,
  });
  const thisCommission = await sumCommissionsForPolicies([policy.id]);

  return (
    <AppShell title={displayName}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="uppercase">{policy.status}</span>
        <span>{policy.policyNumber}</span>
        <span>{formatMoney(policy.premium)}</span>
      </div>

      <RecordSection id="record" title="This policy" summary="Effective, X-Date, commission, files, comms">
        <form action={updatePolicyRecord} className="mb-6 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="policyId" value={policy.id} />
          <div>
            <Label className="text-xs">Policy #</Label>
            <Input name="policyNumber" defaultValue={policy.policyNumber} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <select name="status" defaultValue={policy.status} className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
              <option value="active">Active</option>
              <option value="bound">Bound</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Effective date</Label>
            <Input name="effectiveDate" type="date" defaultValue={dayInput(policy.effectiveDate)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">X-Date (expiration / renewal driver)</Label>
            <Input name="expirationDate" type="date" defaultValue={dayInput(policy.expirationDate)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Gross written premium</Label>
            <Input name="premium" defaultValue={policy.premium ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Cov A (copied at bind — do not retype)</Label>
            <Input
              name="coverageA"
              defaultValue={policy.coverageA != null ? String(policy.coverageA) : ""}
              className="mt-1 h-8"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Premises (copied from the deal risk)</Label>
            <Input name="premisesAddress" defaultValue={policy.premisesAddress ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Premises city</Label>
            <Input name="premisesCity" defaultValue={policy.premisesCity ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">State / ZIP</Label>
            <div className="mt-1 flex gap-2">
              <Input name="premisesState" defaultValue={policy.premisesState ?? ""} className="h-8 w-20" />
              <Input name="premisesZip" defaultValue={policy.premisesZip ?? ""} className="h-8" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Premium frequency</Label>
            <select
              name="billingFrequency"
              defaultValue={policy.billingFrequency ?? "annual"}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Sub-type</Label>
            <Input name="policySubType" defaultValue={policy.policySubType ?? policy.formType ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Selling agency</Label>
            <select
              name="sellingAgency"
              defaultValue={policy.sellingAgency ?? ""}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="">—</option>
              {SELLING_AGENCIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Insurance family</Label>
            <select
              name="commissionFamily"
              defaultValue={family}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              {LINE_FAMILIES.map((key) => (
                <option key={key} value={key}>
                  {LINE_FAMILY_LABEL[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Commission4 %</Label>
            <Input name="commission4Pct" defaultValue={policy.commission4Pct ?? ""} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Number of insured</Label>
            <Input name="insuredCount" defaultValue={String(policy.insuredCount ?? 1)} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">OEP start (health stay-put only)</Label>
            <Input name="oepStart" type="date" defaultValue={dayInput(policy.oepStart)} className="mt-1 h-8" />
          </div>
          <div className="sm:col-span-2 rounded-md bg-secondary/50 px-3 py-2 text-xs">
            <p className="font-medium text-navy">Commission on this policy (Zoho math — no New vs Renewal field)</p>
            <p className="mt-1">{preview.detail}</p>
            <p className="mt-1">
              TAC {preview.totalAnnualCommission} · Monthly {preview.monthlyCommission} · Initial{" "}
              {preview.initialCommission} · Deferred {preview.deferredCommission}
            </p>
          </div>
          <Button type="submit" size="sm">
            Save policy
          </Button>
        </form>

        {isAuto ? <VehiclesList vehicles={vehicles} /> : null}

        <form action={uploadDealSlot} className="my-3 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
          <input type="hidden" name="policyId" value={policy.id} />
          <input type="hidden" name="dealId" value={policy.dealId ?? ""} />
          <input type="hidden" name="slot" value="policy_file" />
          <div>
            <Label className="text-xs">Issued file</Label>
            <select
              name="docType"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue="policy_dec"
            >
              <option value="policy_dec">Issued dec</option>
              <option value="policy_complete">Complete policy</option>
              <option value="policy_id">ID card</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">File</Label>
            <input name="file" type="file" required className="mt-1 block w-full text-xs" />
          </div>
          <Button type="submit" size="sm">
            Attach issued file
          </Button>
        </form>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No issued policy files yet.</p>
        ) : (
          <ul className="text-sm">
            {files.map((file) => (
              <li key={file.id}>
                {file.filename} · {file.docType.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
        )}

        <RecordAskPanel
          entityType="policy"
          entityId={policy.id}
          asks={asks}
          users={users}
          policyId={policy.id}
          contactId={contact?.id}
          accountId={account?.id}
          dealId={deal?.id}
        />
        <div className="mt-6">
          <ActivityTimeline
            items={timeline}
            policyId={policy.id}
            contactId={contact?.id}
            accountId={account?.id}
            dealId={deal?.id}
            phone={contact?.phone ?? account?.phone}
            email={contact?.email ?? account?.email}
            templates={templates}
          />
        </div>
      </RecordSection>

      <RecordSection id="related" title="Related" summary="Insured, deal, carrier, this policy rollup">
        <RelatedRollups premium={toNumber(policy.premium)} commission={thisCommission} />
        <div className="flex flex-wrap gap-3 text-sm">
          {contact ? (
            <RecordLink href={`/contacts/${contact.id}`}>
              Insured {contact.lastName}, {contact.firstName}
            </RecordLink>
          ) : null}
          {account ? <RecordLink href={`/accounts/${account.id}`}>Business {account.name}</RecordLink> : null}
          {deal ? <RecordLink href={`/deals/${deal.id}`}>Deal {deal.title}</RecordLink> : null}
          {carrier ? <RecordLink href={`/carriers/${carrier.id}`}>{carrier.name}</RecordLink> : null}
          <Link
            href={`/policies/${policy.id}/compare`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Compare renewal
          </Link>
        </div>
      </RecordSection>
    </AppShell>
  );
}
