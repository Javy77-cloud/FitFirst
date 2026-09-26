"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import {
  activities,
  activityLogs,
  alerts,
  clientHistory,
  contacts,
  deals,
  policies,
  renewalCompareLogs,
  renewalQueue,
  renewalShoppingResolutions,
  reviewTasks,
  risks,
} from "@/lib/db/schema";
import { renewalLobFamily } from "@/lib/renewal/board-filter";
import { RENEWAL_HANDLED_CLEAR_KINDS } from "@/lib/renewal/handled";
import { healthProductType } from "@/lib/health/product-type";
import { commitHealthPolicyWrite } from "@/lib/health/policy-write";
import { NEW_DEAL_PIPELINE_STAGE, seedNewDealShopFlow } from "@/lib/deals/new-deal-write";
import {
  buildRenewalShoppingSnapshot,
  isShoppingResolution,
  planShoppingResolution,
  planStartRenewalShopping,
  type RenewalShopState,
} from "@/lib/renewal/shopping-branch";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function addYear(date: Date): Date {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

async function suppressBeats(policyId: string) {
  await db
    .update(alerts)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.entityType, "policy"),
        eq(alerts.entityId, policyId),
        inArray(alerts.kind, [...RENEWAL_HANDLED_CLEAR_KINDS]),
      ),
    );
}

function shopState(row: typeof renewalQueue.$inferSelect): RenewalShopState {
  return {
    queueId: row.id,
    policyId: row.policyId,
    stage: row.stage,
    preShoppingStage: row.preShoppingStage,
    shoppingStatus:
      row.shoppingStatus === "in_progress" ||
      row.shoppingStatus === "accepted" ||
      row.shoppingStatus === "replaced" ||
      row.shoppingStatus === "dropped"
        ? row.shoppingStatus
        : null,
    shoppingDealId: row.shoppingDealId,
    beatsSuppressed: row.beatsSuppressed,
    productKey: row.shoppingProductKey || "policy",
    clientRequestedShop: row.clientRequestedShop,
    cancellationRequired: row.cancellationRequired,
    cancelEffective: row.cancelEffective ? row.cancelEffective.toISOString().slice(0, 10) : null,
    replacementPolicyId: row.replacementPolicyId,
  };
}

/** Shop for quotes on the renewal. Does not close the renewal and does not auto-market. */
export async function startRenewalShopping(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const policyId = str(formData, "policyId");
  if (!isUuid(policyId)) throw new Error("Policy required.");

  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) throw new Error("Policy not found.");

  const [contact] = policy.contactId
    ? await db.select().from(contacts).where(eq(contacts.id, policy.contactId))
    : [];

  let [queue] = await db
    .select()
    .from(renewalQueue)
    .where(and(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID), eq(renewalQueue.policyId, policyId)));
  if (!queue) {
    const [created] = await db
      .insert(renewalQueue)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        policyId,
        stage: "upcoming",
        notes: "Opened from Shop for quotes.",
      })
      .returning();
    queue = created!;
  }

  if (queue.shoppingStatus === "in_progress" && queue.shoppingDealId) {
    redirect(`/deals/${queue.shoppingDealId}`);
  }

  const [emailCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(and(eq(activityLogs.tenantId, DEFAULT_TENANT_ID), eq(activityLogs.policyId, policyId), eq(activityLogs.kind, "email")));
  const [latest] = await db
    .select({ body: activities.notes, direction: activities.direction })
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), eq(activities.policyId, policyId)))
    .orderBy(desc(activities.createdAt))
    .limit(1);
  const [compared] = await db
    .select({ id: renewalCompareLogs.id })
    .from(renewalCompareLogs)
    .where(and(eq(renewalCompareLogs.tenantId, DEFAULT_TENANT_ID), eq(renewalCompareLogs.policyId, policyId)))
    .limit(1);

  const family = renewalLobFamily(policy.lineOfBusiness, policy.policySubType, policy.insuranceType, policy.commissionFamily);
  const health = family === "health";
  const productKey = health
    ? healthProductType({
        lineOfBusiness: policy.lineOfBusiness,
        insuranceType: policy.insuranceType,
        policyType: policy.policyType,
        policySubType: policy.policySubType,
        sourceProduct: policy.sourceProduct,
      }) ?? "medical"
    : policy.lineOfBusiness;
  const snapshot = buildRenewalShoppingSnapshot({
    emailsSent: emailCount?.count ?? 0,
    clientResponse: latest?.direction === "inbound" ? latest.body : null,
    comparisonShown: Boolean(compared),
    language: contact?.preferredLanguage || contact?.language || null,
    stage: queue.stage,
    capturedAt: new Date().toISOString(),
  });
  const start = planStartRenewalShopping({
    stage: queue.stage,
    shoppingStatus: queue.shoppingStatus,
    shoppingDealId: queue.shoppingDealId,
    snapshot,
    productKey,
  });

  const shopProduct = health
    ? productKey === "medical" && /medicare|mapd|advantage/i.test(policy.policySubType ?? "")
      ? "health_ma"
      : productKey === "dental" || productKey === "vision"
        ? "health_supplemental"
        : "health_marketplace"
    : null;
  const clientName = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim() || policy.policyNumber;
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: policy.contactId,
      accountId: policy.accountId,
      title: `${clientName} · renewal shop · ${policy.policyNumber}`,
      ...NEW_DEAL_PIPELINE_STAGE,
      lineOfBusiness: health ? "HEALTH" : policy.lineOfBusiness,
      policySubType: policy.policySubType,
      state: contact?.state || "FL",
      notes: health
        ? "Tracking deal only. Quotes are pulled in HealthSherpa, Connector, or the carrier portal. No quoting engine."
        : "Review the risk profile before markets. FitFirst will not auto-market this renewal shop.",
      ownerId: session.userId,
      source: "renewal_shop",
      currentCarrier: null,
      primaryNamedInsured: clientName,
      quotingLine: health ? "health" : null,
      quotingForm: policy.policySubType,
      quotingUnlocked: false,
      quotingReviewRequired: !health,
      renewalShop: true,
      renewalPolicyId: policy.id,
      shopLines: health ? ["health"] : [],
      shopProducts: shopProduct ? [shopProduct] : null,
      shopFlow: seedNewDealShopFlow({
        shopProducts: shopProduct ? [shopProduct] : null,
        shopLines: health ? ["health"] : null,
        lineOfBusiness: health ? "HEALTH" : policy.lineOfBusiness,
        quotingLine: health ? "health" : null,
        quotingForm: policy.policySubType,
        policySubType: policy.policySubType,
      }),
    })
    .returning();

  if (!health && policy.riskId) {
    const [risk] = await db.select().from(risks).where(eq(risks.id, policy.riskId));
    if (risk) {
      const copy = { ...risk, dealId: deal!.id };
      Reflect.deleteProperty(copy, "id");
      Reflect.deleteProperty(copy, "createdAt");
      Reflect.deleteProperty(copy, "updatedAt");
      await db.insert(risks).values(copy);
    }
  }

  await db
    .update(renewalQueue)
    .set({
      stage: start.stage,
      preShoppingStage: start.preShoppingStage,
      shoppingStatus: start.shoppingStatus,
      shoppingDealId: deal!.id,
      shoppingSnapshot: start.snapshot,
      clientRequestedShop: true,
      beatsSuppressed: true,
      shoppingProductKey: productKey,
      updatedAt: new Date(),
    })
    .where(eq(renewalQueue.id, queue.id));

  const [activity] = await db
    .insert(activities)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "note",
      title: "Client requested shop",
      notes: "Shopping logged as client-requested for performance. Renewal stays open.",
      status: "completed",
      policyId,
      dealId: deal!.id,
      contactId: policy.contactId,
      assignee: session.userId,
      outcome: "renewal_shop_client_requested",
    })
    .returning();
  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: activity!.id,
    kind: "note",
    eventType: "renewal_shop_client_requested",
    body: "Client requested shop from the renewal.",
    policyId,
    dealId: deal!.id,
    contactId: policy.contactId,
  });
  if (policy.contactId) {
    await db.insert(clientHistory).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: policy.contactId,
      policyId,
      dealId: deal!.id,
      eventType: "renewal_shop_client_requested",
      body: "Client requested shop from the renewal.",
    });
  }
  await suppressBeats(policyId);

  revalidatePath("/renewals");
  revalidatePath("/deals");
  revalidatePath(`/policies/${policyId}`);
  redirect(`/deals/${deal!.id}`);
}

export async function confirmRenewalRiskReview(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const dealId = str(formData, "dealId");
  if (!isUuid(dealId)) throw new Error("Deal required.");
  const [deal] = await db
    .select({ id: deals.id, renewalShop: deals.renewalShop })
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  if (!deal?.renewalShop) throw new Error("Risk review is for a renewal shopping deal.");
  await db
    .update(deals)
    .set({ quotingUnlocked: true, updatedAt: new Date() })
    .where(eq(deals.id, dealId));
  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}?tab=markets`);
}

/** Accept, replace, or drop the shopping branch. Confirm screens post here. */
export async function resolveRenewalShopping(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const policyId = str(formData, "policyId");
  const resolution = str(formData, "resolution");
  if (!isUuid(policyId)) throw new Error("Policy required.");
  if (!isShoppingResolution(resolution)) throw new Error("Unknown shopping resolution.");

  const [queue] = await db
    .select()
    .from(renewalQueue)
    .where(and(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID), eq(renewalQueue.policyId, policyId)));
  if (!queue) throw new Error("Renewal not found.");
  const [policy] = await db.select().from(policies).where(eq(policies.id, policyId));
  if (!policy) throw new Error("Policy not found.");

  const policyNumber = str(formData, "policyNumber");
  const carrierName = str(formData, "carrierName");
  const planType = str(formData, "planType");
  const premium = str(formData, "premium");
  const effectiveRaw = str(formData, "effectiveDate");
  const hasNewPolicyFields = Boolean(policyNumber);
  const family = renewalLobFamily(policy.lineOfBusiness, policy.policySubType, policy.insuranceType, policy.commissionFamily);
  const health = family === "health";
  const productKey =
    queue.shoppingProductKey ||
    (health
      ? healthProductType({
          lineOfBusiness: policy.lineOfBusiness,
          insuranceType: policy.insuranceType,
          policySubType: policy.policySubType,
          sourceProduct: policy.sourceProduct,
        }) ?? "medical"
      : policy.lineOfBusiness);

  const siblings = policy.contactId
    ? await db
        .select({
          queue: renewalQueue,
          lineOfBusiness: policies.lineOfBusiness,
          policySubType: policies.policySubType,
          insuranceType: policies.insuranceType,
          sourceProduct: policies.sourceProduct,
        })
        .from(renewalQueue)
        .innerJoin(policies, eq(renewalQueue.policyId, policies.id))
        .where(and(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID), eq(policies.contactId, policy.contactId)))
    : [];

  const plan = planShoppingResolution({
    resolution,
    shop: { ...shopState(queue), productKey },
    siblings: siblings.map((row) => ({
      queueId: row.queue.id,
      policyId: row.queue.policyId,
      productKey:
        renewalLobFamily(row.lineOfBusiness, row.policySubType, row.insuranceType) === "health"
          ? healthProductType({
              lineOfBusiness: row.lineOfBusiness,
              policySubType: row.policySubType,
              insuranceType: row.insuranceType,
              sourceProduct: row.sourceProduct,
            }) ?? "medical"
          : row.lineOfBusiness,
      stage: row.queue.stage,
      shoppingStatus: row.queue.shoppingStatus,
      beatsSuppressed: row.queue.beatsSuppressed,
    })),
    newPolicyId: null,
    cancelEffective: resolution === "replace" ? effectiveRaw : null,
    actorId: session.userId,
    at: new Date().toISOString(),
    hasNewPolicyFields,
  });
  if (plan.error) throw new Error(plan.error);

  let newPolicyId: string | null = null;
  if (plan.createPolicy && hasNewPolicyFields) {
    const effective = effectiveRaw ? new Date(`${effectiveRaw}T12:00:00.000Z`) : new Date();
    const expiration = addYear(effective);
    if (health) {
      const [contact] = policy.contactId
        ? await db
            .select({ firstName: contacts.firstName, lastName: contacts.lastName, dateOfBirth: contacts.dateOfBirth })
            .from(contacts)
            .where(eq(contacts.id, policy.contactId))
        : [];
      const clientName = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim();
      const written = await commitHealthPolicyWrite({
        source: "manual",
        confirmed: true,
        actorId: session.userId,
        incoming: {
          contactId: policy.contactId,
          clientName,
          dateOfBirth: contact?.dateOfBirth ?? null,
          policyNumber,
          carrierName,
          planType: planType || policy.policySubType,
          policySubType: planType || policy.policySubType,
          lineOfBusiness: "HEALTH",
          insuranceType: "Health",
          sourceProduct: policy.sourceProduct,
          productType: healthProductType({
            productType: productKey,
            policySubType: planType || policy.policySubType,
            lineOfBusiness: "HEALTH",
          }),
          premium: premium || null,
          bound: true,
          status: "bound",
          intakeSource: "manual",
        },
        insert: {
          contactId: policy.contactId,
          accountId: policy.accountId,
          dealId: queue.shoppingDealId,
          policyNumber,
          lineOfBusiness: "HEALTH",
          insuranceType: "Health",
          policySubType: planType || policy.policySubType,
          sourceProduct: policy.sourceProduct,
          status: "bound",
          effectiveDate: effective,
          expirationDate: expiration,
          premium: premium || null,
          ownerId: session.userId,
        },
      });
      newPolicyId = written.policyId;
    } else {
      const [created] = await db
        .insert(policies)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          contactId: policy.contactId,
          accountId: policy.accountId,
          dealId: queue.shoppingDealId,
          policyNumber,
          lineOfBusiness: policy.lineOfBusiness,
          insuranceType: policy.insuranceType,
          policySubType: policy.policySubType,
          policyType: policy.policyType,
          status: "bound",
          effectiveDate: effective,
          expirationDate: expiration,
          premium: premium || null,
          ownerId: session.userId,
        })
        .returning({ id: policies.id });
      newPolicyId = created!.id;
    }
  }

  if (plan.incumbentStatus) {
    await db
      .update(policies)
      .set({
        status: plan.incumbentStatus,
        endReason: resolution === "replace" ? "replaced" : "non_renewing",
        updatedAt: new Date(),
      })
      .where(eq(policies.id, policyId));
  }

  const cancelEffective = plan.shop.cancelEffective ? new Date(`${plan.shop.cancelEffective}T12:00:00.000Z`) : null;
  await db
    .update(renewalQueue)
    .set({
      stage: plan.shop.stage,
      shoppingStatus: plan.shop.shoppingStatus,
      shoppingDealId: plan.shop.shoppingDealId,
      beatsSuppressed: plan.shop.beatsSuppressed,
      cancellationRequired: plan.shop.cancellationRequired,
      cancelEffective,
      replacementPolicyId: newPolicyId ?? plan.shop.replacementPolicyId,
      healthPipelineStatus: health && resolution !== "drop" ? "bound" : queue.healthPipelineStatus,
      updatedAt: new Date(),
    })
    .where(eq(renewalQueue.id, queue.id));

  if (plan.archiveDeal && queue.shoppingDealId) {
    await db
      .update(deals)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(deals.id, queue.shoppingDealId));
  }

  if (plan.audit) {
    await db.insert(renewalShoppingResolutions).values({
      tenantId: DEFAULT_TENANT_ID,
      renewalQueueId: queue.id,
      shoppingDealId: queue.shoppingDealId,
      policyId,
      resolution: plan.audit.resolution,
      source: plan.audit.source,
      clientRequestedShop: plan.audit.clientRequestedShop,
      oldPolicyId: plan.audit.oldPolicyId,
      newPolicyId: newPolicyId ?? plan.audit.newPolicyId,
      cancelEffective,
      productKey: plan.audit.productKey,
      actorId: session.userId,
    });
  }

  if (resolution === "replace" && cancelEffective) {
    await db.insert(reviewTasks).values({
      tenantId: DEFAULT_TENANT_ID,
      policyId,
      contactId: policy.contactId,
      dealId: queue.shoppingDealId,
      assigneeId: session.userId,
      kind: "cancellation_required",
      title: `Cancellation required · ${policy.policyNumber}`,
      dueDate: cancelEffective,
      status: "open",
    });
  }

  if (plan.shop.beatsSuppressed) await suppressBeats(policyId);

  await db.insert(activities).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "note",
    title: `Shopping ${resolution}`,
    notes: plan.audit
      ? `resolution=${plan.audit.resolution}; source=shopping; clientRequested=${plan.audit.clientRequestedShop}`
      : resolution,
    status: "completed",
    policyId,
    dealId: queue.shoppingDealId,
    contactId: policy.contactId,
    assignee: session.userId,
    outcome: `renewal_shop_${resolution}`,
  });

  revalidatePath("/renewals");
  revalidatePath("/deals");
  revalidatePath(`/policies/${policyId}`);
  if (newPolicyId) revalidatePath(`/policies/${newPolicyId}`);
  redirect(`/policies/${policyId}`);
}
