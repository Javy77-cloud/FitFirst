"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { issuedCertificates, tenants } from "@/lib/db/schema";
import { getAccountWorkspace } from "@/lib/db/queries";
import { buildCertificateDraft, nextCertificateNumber } from "@/lib/certificates/issue";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function issueCertificate(formData: FormData) {
  const businessId = str(formData, "businessId") || str(formData, "accountId");
  const workspace = await getAccountWorkspace(businessId);
  if (!workspace) {
    redirect("/accounts");
  }

  const draft = buildCertificateDraft(
    workspace.policies.map(({ policy, carrier }) => ({
      id: policy.id,
      lineOfBusiness: policy.lineOfBusiness,
      status: policy.status,
      policyNumber: policy.policyNumber,
      carrierName: carrier?.name ?? "Unknown carrier",
      effectiveDate: policy.effectiveDate,
      expirationDate: policy.expirationDate,
      coverageLimits: policy.coverageLimits,
    })),
    {
      holderName: str(formData, "holderName"),
      holderAddress: str(formData, "holderAddress"),
      jobLocation: str(formData, "jobLocation"),
    },
  );

  if (!draft.ok) {
    redirect(`/accounts/${businessId}?error=${encodeURIComponent(draft.error)}`);
  }

  const [countRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(issuedCertificates)
    .where(
      and(eq(issuedCertificates.tenantId, DEFAULT_TENANT_ID), eq(issuedCertificates.accountId, businessId)),
    );

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, DEFAULT_TENANT_ID));

  const issuedAt = new Date();
  const [row] = await db
    .insert(issuedCertificates)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      accountId: businessId,
      businessId,
      certificateNumber: nextCertificateNumber(Number(countRow?.n ?? 0), issuedAt),
      holderName: draft.draft.holderName,
      holderAddress: draft.draft.holderAddress,
      jobLocation: draft.draft.jobLocation,
      lines: draft.draft.lines,
      producerName: tenant?.name ?? "FitFirst",
      issuedAt,
      status: "issued",
    })
    .returning();

  revalidatePath(`/accounts/${businessId}`);
  revalidatePath(`/businesses/${businessId}`);
  revalidatePath("/accounts");
  revalidatePath("/businesses");
  redirect(`/businesses/${businessId}/certificates/${row.id}`);
}
