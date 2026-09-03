import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AskThread } from "@/components/ask-thread";
import { PolicyCommissionBlock } from "@/components/commissions/policy-commission-block";
import { OwnerSelect } from "@/components/owner-select";
import { canAssignOwner } from "@/lib/auth/rbac";
import { formatMoney, sellingAgencyLabel } from "@/lib/domain";
import { getPolicyRecord, listAsksFor, listUsers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

function day(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function PolicyRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, users] = await Promise.all([getPolicyRecord(id), listUsers()]);
  if (!record) notFound();

  const { policy, contact, carrier, owner, actor, commissions } = record;
  const primary = commissions[0] ?? null;
  const asks = await listAsksFor("policy", policy.id);
  const assign = canAssignOwner(actor);

  return (
    <AppShell
      title={policy.policyNumber}
      actions={
        <Link href="/policies" className="text-sm text-primary hover:underline">
          All policies
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Bound policy record. Files, activity, and compare chrome belong to the policy
        desk. This page mounts the commission block. Ana Dib stays unbound — Cov A
        $321,000 is not on this record.
      </p>

      <section className="ff-card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <div className="text-[11px] text-muted-foreground">Client</div>
            <div className="font-medium">
              {contact ? `${contact.lastName}, ${contact.firstName}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Carrier</div>
            <div>{carrier?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Line</div>
            <div>{policy.lineOfBusiness}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Policy status</div>
            <div className="font-medium capitalize">{policy.status}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Effective</div>
            <div>{day(policy.effectiveDate)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Expires</div>
            <div>{day(policy.expirationDate)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Selling agency</div>
            <div>{sellingAgencyLabel(primary?.commission.sellingAgency)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Book premium</div>
            <div>{formatMoney(policy.premium)}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[11px] text-muted-foreground">Owner</span>
          <OwnerSelect
            entityType="policy"
            entityId={policy.id}
            ownerId={policy.ownerId}
            users={users}
            canAssign={assign}
          />
          {owner ? <span className="text-muted-foreground">{owner.name}</span> : null}
        </div>
        <div className="mt-3">
          <AskThread
            entityType="policy"
            entityId={policy.id}
            actor={actor}
            asks={asks}
          />
        </div>
      </section>

      <PolicyCommissionBlock
        values={{
          policyId: policy.id,
          commissionId: primary?.commission.id ?? null,
          producerStatus: primary?.commission.status ?? null,
          insuranceType: policy.insuranceType ?? primary?.commission.insuranceType ?? "",
          policyType: policy.policyType ?? primary?.commission.policyType ?? "",
          policySubType: policy.policySubType ?? primary?.commission.policySubType ?? "",
          sellingAgency: primary?.commission.sellingAgency ?? "afa",
          gwp: String(policy.gwp ?? primary?.commission.gwp ?? ""),
          commission4: String(policy.commission4 ?? primary?.commission.commission4 ?? ""),
          premiumFrequency:
            policy.premiumFrequency ?? primary?.commission.premiumFrequency ?? "",
          numberOfInsured: String(
            policy.numberOfInsured ?? primary?.commission.numberOfInsured ?? "",
          ),
          paymentStatus: primary?.commission.paymentStatus ?? "",
          paymentReferenceBatch: primary?.commission.paymentReferenceBatch ?? "",
          dueDate: day(primary?.commission.dueDate),
          paidDate: day(primary?.commission.paidDate),
        }}
      />

      {commissions.length > 1 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          This policy has {commissions.length} producer-pay rows. The block edits the
          latest one. Older rows stay on{" "}
          <Link href="/commissions" className="text-primary hover:underline">
            Commissions
          </Link>
          .
        </p>
      ) : null}
    </AppShell>
  );
}
