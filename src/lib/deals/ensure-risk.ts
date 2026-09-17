import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { risks } from "@/lib/db/schema";

export const DEAL_RISK_INSERT_FAILED = "Deal create failed: could not insert a risk row.";

export type DealRiskHint = {
  lineOfBusiness?: string | null;
  quotingLine?: string | null;
  shopLines?: string[] | null;
};

/** Auto when LOB / quoting / sole shop line is Auto; Life/Health and Home use `property`. */
export function riskTypeForDeal(deal: DealRiskHint): "auto" | "property" {
  const lob = (deal.lineOfBusiness ?? "").trim().toUpperCase();
  const quoting = (deal.quotingLine ?? "").trim().toLowerCase();
  const lines = (deal.shopLines ?? []).map((line) => String(line).trim().toLowerCase());
  if (lob === "AUTO" || quoting === "auto") return "auto";
  if (lines.length === 1 && lines[0] === "auto") return "auto";
  return "property";
}

export type EnsureDealRiskInput = DealRiskHint & {
  tenantId?: string;
  dealId: string;
  state?: string | null;
  contactId?: string | null;
};

export type EnsureDealRiskResult = {
  id: string;
  created: boolean;
  risk: typeof risks.$inferSelect;
};

function blankRiskValues(input: EnsureDealRiskInput) {
  return {
    tenantId: input.tenantId || DEFAULT_TENANT_ID,
    dealId: input.dealId,
    contactId: input.contactId ?? null,
    riskType: riskTypeForDeal(input),
    state: input.state?.trim() || "FL",
  };
}

/** Insert a blank risk and throw if the row is not returned. */
export async function insertRequiredDealRisk(
  input: EnsureDealRiskInput,
): Promise<typeof risks.$inferSelect> {
  const [created] = await db.insert(risks).values(blankRiskValues(input)).returning();
  if (!created) throw new Error(DEAL_RISK_INSERT_FAILED);
  return created;
}

/** Require a just-inserted risk row — fail the create instead of redirecting to a broken deal. */
export function requireInsertedRisk<T>(row: T | undefined | null, context = "Deal create"): T {
  if (!row) throw new Error(`${context} failed: could not insert a risk row.`);
  return row;
}

/** Idempotent: return the existing risk or insert a blank one. */
export async function ensureDealRisk(input: EnsureDealRiskInput): Promise<EnsureDealRiskResult> {
  const tenantId = input.tenantId || DEFAULT_TENANT_ID;
  const [existing] = await db
    .select()
    .from(risks)
    .where(and(eq(risks.tenantId, tenantId), eq(risks.dealId, input.dealId)));
  if (existing) return { id: existing.id, created: false, risk: existing };

  const created = await insertRequiredDealRisk({ ...input, tenantId });
  return { id: created.id, created: true, risk: created };
}
