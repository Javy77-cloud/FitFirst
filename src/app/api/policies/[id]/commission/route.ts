import { NextResponse } from "next/server";
import { canSeeOwned } from "@/lib/auth/rbac";
import { getActor } from "@/lib/auth/session";
import { computePolicyCommission, policyCommissionVisibility } from "@/lib/commissions/policy-math";
import { savePolicyCommissionFields, type PolicyCommissionFields } from "@/lib/commissions/persist";
import { getPolicyRecord } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

function day(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function payload(record: NonNullable<Awaited<ReturnType<typeof getPolicyRecord>>>) {
  const commission = record.commissions[0]?.commission ?? null;
  const policy = record.policy;
  const input = {
    insuranceType: policy.insuranceType ?? commission?.insuranceType,
    policyType: policy.policyType ?? commission?.policyType,
    policySubType: policy.policySubType ?? commission?.policySubType,
    sellingAgency: commission?.sellingAgency ?? "afa",
    gwp: policy.gwp ?? commission?.gwp,
    commission4: policy.commission4 ?? commission?.commission4,
    premiumFrequency: policy.premiumFrequency ?? commission?.premiumFrequency,
    numberOfInsured: policy.numberOfInsured ?? commission?.numberOfInsured,
  };
  return {
    policyId: policy.id,
    policyNumber: policy.policyNumber,
    policyStatus: policy.status,
    commissionId: commission?.id ?? null,
    fields: {
      ...input,
      paymentStatus: commission?.paymentStatus ?? null,
      paymentReferenceBatch: commission?.paymentReferenceBatch ?? null,
      dueDate: day(commission?.dueDate),
      paidDate: day(commission?.paidDate),
    },
    stored: commission
      ? {
          initialCommission: commission.initialCommission,
          deferredCommission: commission.deferredCommission,
          monthlyCommission: commission.monthlyCommission,
          totalAnnualCommission: commission.totalAnnualCommission,
          producerStatus: commission.status,
        }
      : null,
    computed: computePolicyCommission(input),
    visibility: policyCommissionVisibility(input),
    note: "Local desk math copied from live Zoho Policies. This route does not write to Zoho.",
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const record = await getPolicyRecord(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(payload(record));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getActor();
  const { id } = await params;
  const record = await getPolicyRecord(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canSeeOwned(actor, record.policy.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Partial<PolicyCommissionFields>;
  await savePolicyCommissionFields(
    id,
    {
      insuranceType: body.insuranceType ?? null,
      policyType: body.policyType ?? null,
      policySubType: body.policySubType ?? null,
      sellingAgency: body.sellingAgency ?? null,
      gwp: body.gwp ?? null,
      commission4: body.commission4 ?? null,
      premiumFrequency: body.premiumFrequency ?? null,
      numberOfInsured: body.numberOfInsured ?? null,
      paymentStatus: body.paymentStatus ?? null,
      paymentReferenceBatch: body.paymentReferenceBatch ?? null,
      dueDate: body.dueDate ?? null,
      paidDate: body.paidDate ?? null,
    },
    actor.id,
  );
  const next = await getPolicyRecord(id);
  if (!next) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(payload(next));
}
