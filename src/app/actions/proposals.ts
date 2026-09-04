"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, risks } from "@/lib/db/schema";
import { generateDealProposalPdf } from "@/lib/proposals/store";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function generateDealProposal(formData: FormData) {
  const dealId = str(formData, "dealId");
  if (!dealId) throw new Error("Deal is required.");
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  if (!deal) throw new Error("Deal not found.");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));

  const result = await generateDealProposalPdf({
    deal: {
      id: deal.id,
      title: deal.title,
      insuredName: deal.primaryNamedInsured,
      line: deal.lineOfBusiness,
      state: deal.state ?? risk?.state ?? "FL",
      coverageA: risk?.coverageA ?? deal.coverageAmount ?? null,
      riskId: risk?.id ?? null,
      contactId: deal.contactId ?? risk?.contactId ?? null,
    },
    need: {
      coverageA: risk?.coverageA ?? deal.coverageAmount ?? null,
      state: deal.state ?? risk?.state ?? "FL",
      line: deal.lineOfBusiness,
      wantsFlood: true,
    },
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/deals/${dealId}/compare`);
  redirect(`/files/${result.documentId}`);
}
