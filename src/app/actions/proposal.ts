"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { AGENCY_BRAND, DEFAULT_TENANT_ID } from "@/lib/domain";
import { formatPersonName } from "@/lib/crm/display";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getAgencyBrand } from "@/lib/db/brand-queries";
import { getAgencySettings, getDealWorkspace } from "@/lib/db/queries";
import { deals, documents } from "@/lib/db/schema";
import { collectCompareQuotes, parseSelectedIds } from "@/lib/quotes/compare";
import { buildBrandedProposalPdf, PROPOSAL_PDF_DOC_TYPE, PROPOSAL_SLOT, proposalFilename } from "@/lib/quotes/proposal-pdf";
import { normalizeVideoProposalUrl } from "@/lib/quotes/video-proposal";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function selectedFromForm(form: FormData): string[] {
  const many = form.getAll("quoteId").map((value) => String(value));
  const csv = String(form.get("quoteIds") ?? "");
  return [...many, ...csv.split(",")].map((id) => id.trim()).filter(Boolean);
}

export async function saveVideoProposalUrl(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) redirect("/login");
  const dealId = String(formData.get("dealId") ?? "");
  const workspace = await getDealWorkspace(dealId);
  if (!workspace) throw new Error("Deal not found");

  const raw = String(formData.get("videoProposalUrl") ?? "");
  const clear = formData.get("clear") === "1" || raw.trim() === "";
  const url = clear ? null : normalizeVideoProposalUrl(raw);
  if (!clear && raw.trim() && !url) {
    redirect(`/deals/${dealId}/compare?notice=bad-video-url`);
  }

  await db
    .update(deals)
    .set({ videoProposalUrl: url, updatedAt: new Date() })
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));

  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/deals/${dealId}/compare`);
  redirect(`/deals/${dealId}/compare?notice=${url ? "video-saved" : "video-cleared"}`);
}

export async function generateBrandedProposal(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) redirect("/login");
  const dealId = String(formData.get("dealId") ?? "");
  const workspace = await getDealWorkspace(dealId);
  if (!workspace) throw new Error("Deal not found");

  const shop = collectCompareQuotes({ quotes: workspace.quotes, logs: workspace.logs });
  const selectedIds = parseSelectedIds(selectedFromForm(formData).join(","), shop.map((row) => row.id));
  const selected = shop.filter((row) => selectedIds.includes(row.id));
  if (selected.length === 0) {
    redirect(`/deals/${dealId}/compare?notice=pick-quotes`);
  }

  const [brand, settings] = await Promise.all([getAgencyBrand(), getAgencySettings()]);
  const insured =
    workspace.deal.primaryNamedInsured ||
    (workspace.contact ? formatPersonName(workspace.contact) : null) ||
    workspace.account?.name ||
    null;
  const buffer = await buildBrandedProposalPdf({
    dealTitle: workspace.deal.title,
    insuredName: insured,
    brand: {
      agencyName: brand?.agencyName || ("agencyName" in settings ? settings.agencyName : null) || AGENCY_BRAND.name,
      phone: AGENCY_BRAND.phone,
    },
    quotes: selected,
    videoProposalUrl: workspace.deal.videoProposalUrl,
  });

  const filename = proposalFilename(workspace.deal.title);
  const id = randomUUID();
  const storagePath = path.join(DEFAULT_TENANT_ID, dealId, `${id}-${filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  await db.insert(documents).values({
    id,
    tenantId: DEFAULT_TENANT_ID,
    riskId: workspace.risk?.id ?? null,
    dealId,
    contactId: workspace.contact?.id ?? workspace.deal.contactId ?? null,
    accountId: workspace.account?.id ?? workspace.deal.accountId ?? null,
    filename,
    mimeType: "application/pdf",
    storagePath,
    docType: PROPOSAL_PDF_DOC_TYPE,
    slot: PROPOSAL_SLOT,
    status: "attached",
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/deals/${dealId}/compare`);
  redirect(`/files/${id}`);
}
