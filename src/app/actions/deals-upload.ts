"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { formatPersonName } from "@/lib/crm/display";
import { buildDealTitle, clientNameFromStoredTitle } from "@/lib/deals/deal-title";
import { matchDealLookup } from "@/lib/deals/lookup";
import { uploadDealCta } from "@/lib/deals/pipeline-desk";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { listDealLookup } from "@/lib/db/queries";
import { contacts, deals, pipelines } from "@/lib/db/schema";
import { isUuid } from "@/lib/ids";
import { insertRequiredDealRisk } from "@/lib/deals/ensure-risk";
import { NEW_DEAL_PIPELINE_STAGE, seedNewDealShopFlow } from "@/lib/deals/new-deal-write";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createDealFromUploadSearch(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in to create a deal.");
  const dealName = str(formData, "dealName");
  const requestedId = str(formData, "dealId");
  const lookup = await listDealLookup();
  const cta = uploadDealCta(lookup, dealName, requestedId || null);
  if (cta.kind === "select" && cta.match) {
    redirect(`/deals?notice=selected&q=${encodeURIComponent(cta.match.partyName || cta.match.title)}`);
  }
  if (!dealName) {
    redirect("/deals?notice=need-deal");
  }
  const existing = matchDealLookup(lookup, dealName, requestedId || null);
  if (existing) {
    redirect(`/deals?notice=selected&q=${encodeURIComponent(existing.partyName || existing.title)}`);
  }

  const contactId = isUuid(str(formData, "contactId")) ? str(formData, "contactId") : "";
  const [pickedContact] = contactId
    ? await db.select().from(contacts).where(eq(contacts.id, contactId))
    : [];
  const title =
    buildDealTitle({
      contact: pickedContact,
      primaryNamedInsured: clientNameFromStoredTitle(dealName),
    }) || "Untitled deal";
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, DEFAULT_TENANT_ID), eq(pipelines.slug, "p-c")));
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      title,
      lineOfBusiness: "HO",
      ...NEW_DEAL_PIPELINE_STAGE,
      shopFlow: seedNewDealShopFlow({ shopLines: ["home"], lineOfBusiness: "HO" }),
      pipelineId: pipeline?.id,
      state: pickedContact?.state || "FL",
      ownerId: session.userId,
      contactId: pickedContact?.id ?? null,
      accountKind: "personal",
      bindTarget: "contact",
      primaryNamedInsured: pickedContact
        ? formatPersonName(pickedContact)
        : clientNameFromStoredTitle(dealName),
    })
    .returning();
  if (!deal) throw new Error("Deal create failed: could not insert a deal row.");
  await insertRequiredDealRisk({
    dealId: deal.id,
    contactId: pickedContact?.id ?? null,
    lineOfBusiness: deal.lineOfBusiness,
    shopLines: ["home"],
    state: deal.state,
  });
  revalidatePath("/deals");
  redirect(`/deals?notice=created&q=${encodeURIComponent(deal?.title || dealName)}`);
}
