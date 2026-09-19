"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID, formatDay, formatMoney } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { alerts, policies, policyTerms } from "@/lib/db/schema";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { sendDeskEmail } from "@/app/actions/comms";
import {
  coverageRows,
  deductiblesForLine,
  parseMoney,
  premiumChange,
} from "@/lib/renewal/compare";
import { compareLineTone, toneCoverageRows } from "@/lib/renewal/compare-tone";
import { summarizeRenewalDiff, type GeminiDiffNote } from "@/lib/renewal/gemini-diff";
import { loadPartyHealth } from "@/lib/health/load";
import type { HealthChipView } from "@/lib/health/model";
import { daysUntilExpiration, expirationDay } from "@/lib/ams/renewals";
import { deskNow } from "@/lib/home/as-of";
import { CHASE_EVENT, CHASE_MARK, chaseTemplateFor } from "@/lib/renewal/chase";
import { REVIEW_EVENT, REVIEW_SKIP_EVENT } from "@/lib/renewal/chase";
import { renewalUrgencyBand } from "@/lib/renewal/urgency";
import { MINI_REVIEW_QUESTIONS } from "@/lib/renewal/mini-review";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshRenewals(policyId?: string | null) {
  revalidatePath("/renewals");
  revalidatePath("/renewals/queue");
  if (policyId) revalidatePath(`/policies/${policyId}`);
}

export type RenewalCompareDrawerPayload = {
  policyId: string;
  clientName: string;
  policyNumber: string;
  lineOfBusiness: string;
  bothSides: boolean;
  dark: boolean;
  currentPremium: string;
  proposedPremium: string;
  premiumDelta: string | null;
  premiumTone: "green" | "amber" | "red";
  rows: Array<{
    key: string;
    label: string;
    currentValue: string;
    proposedValue: string;
    tone: "green" | "amber" | "red";
  }>;
  note: GeminiDiffNote;
  clientHealth: HealthChipView | null;
  policyHealth: HealthChipView | null;
};

export async function loadRenewalCompareDrawer(
  policyId: string,
): Promise<RenewalCompareDrawerPayload | { ok: false; error: string }> {
  const session = await currentDeskSession();
  if (!session.signedIn) return { ok: false, error: "Sign in required." };
  if (!isUuid(policyId)) return { ok: false, error: "Policy required." };

  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return { ok: false, error: "Policy not found." };

  const terms = await db
    .select()
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.policyId, policyId)));
  const current = terms.find((row) => row.role === "current");
  const proposed = terms.find((row) => row.role === "proposed");
  const currentPremium = current?.premium ?? policy.premium ?? "—";
  const proposedPremium = proposed?.premium ?? "—";
  const curMoney = parseMoney(current?.premium ?? policy.premium);
  const nextMoney = parseMoney(proposed?.premium);
  const bothSides = curMoney != null && nextMoney != null;
  const change = bothSides && curMoney != null && nextMoney != null ? premiumChange(curMoney, nextMoney) : null;
  const deductibleDefs = deductiblesForLine(policy.lineOfBusiness);
  const coverage = toneCoverageRows(coverageRows(current?.coverages, proposed?.coverages));
  const rows = [
    {
      key: "term",
      label: "Term",
      currentValue: current
        ? `${formatDay(current.termEffective)} → ${formatDay(current.termExpiration)}`
        : "—",
      proposedValue: proposed
        ? `${formatDay(proposed.termEffective)} → ${formatDay(proposed.termExpiration)}`
        : "—",
      tone: compareLineTone({
        currentValue: current ? "set" : "—",
        proposedValue: proposed ? "set" : "—",
        kind: "term",
      }),
    },
    {
      key: "premium",
      label: "Premium",
      currentValue: formatMoney(currentPremium === "—" ? null : currentPremium),
      proposedValue: formatMoney(proposedPremium === "—" ? null : proposedPremium),
      tone: compareLineTone({
        currentValue: String(currentPremium),
        proposedValue: String(proposedPremium),
        kind: "premium",
      }),
    },
    ...deductibleDefs.map((field) => {
      const left = current?.[field.key] ?? "—";
      const right = proposed?.[field.key] ?? "—";
      return {
        key: field.key,
        label: field.label,
        currentValue: left,
        proposedValue: right,
        tone: compareLineTone({ currentValue: left, proposedValue: right, kind: "deductible" }),
      };
    }),
    ...coverage,
  ];

  const note = await summarizeRenewalDiff({
    bothSides,
    change,
    rows: coverage,
    clientName: policy.policyNumber,
    lineOfBusiness: policy.lineOfBusiness,
  });
  const health = await loadPartyHealth({
    contactId: policy.contactId,
    accountId: policy.accountId,
    policyId: policy.id,
    daysUntil: (() => {
      const exp = expirationDay(policy.expirationDate);
      return exp ? daysUntilExpiration(exp, deskNow()) : null;
    })(),
    premiumDelta: change?.delta ?? null,
  }).catch(() => ({ client: null, policy: null }));

  return {
    policyId,
    clientName: policy.policyNumber,
    policyNumber: policy.policyNumber,
    lineOfBusiness: policy.lineOfBusiness,
    bothSides,
    dark: !bothSides,
    currentPremium: formatMoney(currentPremium === "—" ? null : currentPremium),
    proposedPremium: formatMoney(proposedPremium === "—" ? null : proposedPremium),
    premiumDelta: change ? `${change.delta > 0 ? "+" : ""}${formatMoney(Math.abs(change.delta))}` : null,
    premiumTone: rows.find((row) => row.key === "premium")?.tone ?? "amber",
    rows,
    note,
    clientHealth: health.client,
    policyHealth: health.policy,
  };
}

export async function sendRenewalChase(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const policyId = str(formData, "policyId");
  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  const email = str(formData, "email");
  const clientName = str(formData, "clientName") || "there";
  const carrierName = str(formData, "carrierName");
  const policyNumber = str(formData, "policyNumber");
  const daysUntil = Number(str(formData, "daysUntil"));
  const premiumDeltaRaw = str(formData, "premiumDelta");
  const premiumDelta = premiumDeltaRaw ? Number(premiumDeltaRaw) : null;
  if (!isUuid(policyId)) throw new Error("Policy required.");

  const band = renewalUrgencyBand(Number.isFinite(daysUntil) ? daysUntil : 90);
  const template = chaseTemplateFor({
    band,
    clientName,
    daysUntil: Number.isFinite(daysUntil) ? daysUntil : 90,
    premiumDelta: Number.isFinite(premiumDelta) ? premiumDelta : null,
    carrierName,
    policyNumber,
  });
  const mark = CHASE_MARK[band];
  const body = `${mark}\n\n${template.body}`;

  if (email || contactId || accountId) {
    const fd = new FormData();
    fd.set("policyId", policyId);
    if (contactId) fd.set("contactId", contactId);
    if (accountId) fd.set("accountId", accountId);
    if (email) fd.set("toAddress", email);
    fd.set("subject", template.subject);
    fd.set("body", body);
    await sendDeskEmail(fd);
  } else {
    await writeDeskComms({
      kind: "task",
      title: template.subject,
      body,
      eventType: CHASE_EVENT,
      status: "completed",
      policyId,
      contactId: isUuid(contactId) ? contactId : null,
      accountId: isUuid(accountId) ? accountId : null,
      assignee: session.userId,
    });
  }

  await writeDeskComms({
    kind: "task",
    title: `Renewal chase · ${template.label}`,
    body: `${mark} Logged ${template.label}. ${email ? "Outbound email queued — nothing left the desk." : "No email on file — chase logged only."}`,
    eventType: CHASE_EVENT,
    status: "completed",
    policyId,
    contactId: isUuid(contactId) ? contactId : null,
    accountId: isUuid(accountId) ? accountId : null,
    assignee: session.userId,
  });

  const alertId = str(formData, "alertId");
  if (alertId && isUuid(alertId)) {
    await db
      .update(alerts)
      .set({ readAt: new Date() })
      .where(and(eq(alerts.id, alertId), eq(alerts.tenantId, DEFAULT_TENANT_ID)));
  }

  refreshRenewals(policyId);
  revalidatePath("/notifications");
  const returnTo = str(formData, "returnTo");
  redirect(returnTo.startsWith("/") ? returnTo : "/renewals?notice=chase_logged");
}

export async function submitRenewalMiniReview(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const policyId = str(formData, "policyId");
  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  const trigger = str(formData, "trigger") || "chase";
  if (!isUuid(policyId)) throw new Error("Policy required.");

  const scores: Record<string, number> = {};
  for (const question of MINI_REVIEW_QUESTIONS) {
    const raw = Number(str(formData, `score_${question.id}`));
    if (Number.isFinite(raw) && raw >= 1 && raw <= 5) scores[question.id] = raw;
  }
  if (Object.keys(scores).length === 0) {
    redirect("/renewals?error=" + encodeURIComponent("Rate at least one question."));
  }

  try {
    await writeDeskComms({
      kind: "task",
      title: "Renewal mini-review",
      body: `[renewal-review] ${JSON.stringify({ trigger, scores })}`,
      eventType: REVIEW_EVENT,
      status: "completed",
      policyId,
      contactId: isUuid(contactId) ? contactId : null,
      accountId: isUuid(accountId) ? accountId : null,
      assignee: session.userId,
    });
  } catch {
    redirect("/renewals?error=" + encodeURIComponent("Could not save that pulse. Your book is still saved."));
  }
  refreshRenewals(policyId);
  redirect("/renewals?notice=review_saved");
}

export async function skipRenewalMiniReview(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const policyId = str(formData, "policyId");
  const contactId = str(formData, "contactId");
  const accountId = str(formData, "accountId");
  const skipCount = Number(str(formData, "skipCount") || "0");
  if (!isUuid(policyId)) throw new Error("Policy required.");
  if (skipCount >= 1) {
    redirect("/renewals?error=" + encodeURIComponent("Skip once, not twice — finish the review."));
  }

  await writeDeskComms({
    kind: "task",
    title: "Renewal mini-review skipped",
    body: "[renewal-review-skip] trigger=desk",
    eventType: REVIEW_SKIP_EVENT,
    status: "completed",
    policyId,
    contactId: isUuid(contactId) ? contactId : null,
    accountId: isUuid(accountId) ? accountId : null,
    assignee: session.userId,
  });
  refreshRenewals(policyId);
  redirect("/renewals?notice=review_skipped");
}
