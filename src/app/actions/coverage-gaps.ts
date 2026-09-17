"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { createDeal } from "@/app/actions/crm";
import { ensureQuoteSheet } from "@/app/actions/quote-sheet";
import { currentDeskSession } from "@/lib/auth/session";
import { isOpenDealStage } from "@/lib/coverage/notices";
import {
  gapDismissParty,
  isGapDismissReason,
  type GapDismissReason,
} from "@/lib/coverage/renewal-gaps";
import { upsertCoverageGapDismissal } from "@/lib/coverage/gap-dismissals";
import { loadRecordValues, writeRecordValues } from "@/lib/custom-fields/store";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, policies } from "@/lib/db/schema";
import {
  dealProductSwitcherHref,
  inferDealProducts,
  mergeDealProducts,
  parseDealProduct,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { cascadeValuesFromDealHints } from "@/lib/deals/insurance-cascade";
import { packageCreateDraft } from "@/lib/deals/package-lines";
import { mergeShopFlowProductStages } from "@/lib/deals/new-deal-write";
import { withFlash } from "@/lib/flash";
import { isUuid } from "@/lib/ids";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshGapSurfaces(input: {
  policyId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
}) {
  revalidatePath("/renewals");
  revalidatePath("/renewals/queue");
  revalidatePath("/deals");
  if (input.policyId) revalidatePath(`/policies/${input.policyId}`);
  if (input.dealId) revalidatePath(`/deals/${input.dealId}`);
  if (input.contactId) revalidatePath(`/contacts/${input.contactId}`);
  if (input.accountId) revalidatePath(`/accounts/${input.accountId}`);
}

export async function dismissCoverageGap(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");

  const ruleId = str(formData, "ruleId");
  const reasonRaw = str(formData, "reason");
  if (!ruleId) throw new Error("Gap required.");
  if (!isGapDismissReason(reasonRaw)) throw new Error("Pick a dismiss reason.");

  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  const policyId = str(formData, "policyId");
  const dealId = str(formData, "dealId");
  const party = gapDismissParty({
    contactId: isUuid(contactId) ? contactId : null,
    accountId: isUuid(accountId) ? accountId : null,
  });
  if (!party) throw new Error("Household required to dismiss a gap.");

  await upsertCoverageGapDismissal({
    party,
    ruleId,
    reason: reasonRaw as GapDismissReason,
    dismissedBy: session.userId,
  });
  refreshGapSurfaces({
    policyId: isUuid(policyId) ? policyId : null,
    dealId: isUuid(dealId) ? dealId : null,
    contactId: isUuid(contactId) ? contactId : null,
    accountId: isUuid(accountId) ? accountId : null,
  });
}

async function addProductToExistingDeal(dealId: string, productId: DealProductId) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found.");
  const existing = inferDealProducts({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
  const already = existing.includes(productId);
  const nextProducts = mergeDealProducts(existing, [productId]);
  const draft = packageCreateDraft(nextProducts);
  const added = draft.shopLines.filter((line) => !(deal.shopLines ?? []).includes(line));
  for (const line of added) {
    await ensureQuoteSheet(dealId, line);
  }
  await db
    .update(deals)
    .set({
      shopLines: draft.shopLines,
      shopProducts: draft.products,
      quotingLine: already ? deal.quotingLine : draft.quotingLine,
      quotingForm: already ? deal.quotingForm : draft.quotingForm,
      shopFlow: mergeShopFlowProductStages(deal.shopFlow, nextProducts),
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
  const stored = await loadRecordValues(dealId, "deals").catch(() => ({}) as Record<string, string>);
  await writeRecordValues(
    dealId,
    {
      ...stored,
      ...cascadeValuesFromDealHints({
        shopProducts: draft.products,
        shopLines: draft.shopLines,
        lineOfBusiness: draft.lineOfBusiness,
        quotingLine: draft.quotingLine,
        quotingForm: draft.quotingForm,
        policySubType: draft.quotingForm,
      }),
    },
    "deals",
  ).catch(() => null);
  revalidatePath(`/deals/${dealId}`);
  redirect(
    withFlash(
      dealProductSwitcherHref({ dealId, product: productId, tab: "details" }),
      already ? "product-already-on-package" : "product-added-to-package",
    ),
  );
}

export async function addCoverageGapProductToPackage(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");

  const productId = parseDealProduct(str(formData, "productId"));
  if (!productId) throw new Error("Unknown product.");

  const policyId = str(formData, "policyId");
  const dealIdRaw = str(formData, "dealId");
  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  const currentProductId = parseDealProduct(str(formData, "currentProductId"));

  let dealId = isUuid(dealIdRaw) ? dealIdRaw : null;
  if (!dealId && isUuid(policyId)) {
    const [policy] = await db
      .select({ dealId: policies.dealId })
      .from(policies)
      .where(eq(policies.id, policyId));
    dealId = policy?.dealId ?? null;
  }

  if (!dealId && (isUuid(contactId) || isUuid(accountId))) {
    const rows = await db
      .select({
        id: deals.id,
        pipelineStage: deals.pipelineStage,
        contactId: deals.contactId,
        accountId: deals.accountId,
      })
      .from(deals)
      .where(
        and(
          eq(deals.tenantId, DEFAULT_TENANT_ID),
          isUuid(contactId) ? eq(deals.contactId, contactId) : eq(deals.accountId, accountId),
        ),
      );
    const open = rows.find((row) => isOpenDealStage(row.pipelineStage));
    dealId = open?.id ?? null;
  }

  if (dealId) {
    await addProductToExistingDeal(dealId, productId);
  }

  if (!isUuid(contactId) && !isUuid(accountId)) {
    throw new Error("Link a contact or business before adding a product to a package.");
  }

  const fd = new FormData();
  if (isUuid(contactId)) fd.set("contactId", contactId);
  if (isUuid(accountId)) fd.set("accountId", accountId);
  if (currentProductId) fd.append("shopProducts", currentProductId);
  fd.append("shopProducts", productId);
  fd.set("source", "coverage-gap");
  await createDeal(fd);
}
