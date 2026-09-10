/**
 * Load Auto feature snapshot for a deal (quote sheet + risk) for learning log writes.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quoteSheets, risks } from "@/lib/db/schema";
import type { AutoFeatureSnapshot } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  buildAutoFeatureSnapshot,
  isAutoPremiumLine,
} from "@/lib/appetite/auto-premium-learning";

function isAutoLine(lineOfBusiness: string | null | undefined): boolean {
  if (isAutoPremiumLine(lineOfBusiness)) return true;
  return String(lineOfBusiness ?? "").trim().toLowerCase() === "auto";
}

/** When LOB is Auto, return snapshot payload to spread onto quote_attempt_logs insert. */
export async function autoSnapshotFieldsForDeal(
  dealId: string,
  lineOfBusiness: string | null | undefined,
): Promise<{ autoFeatureSnapshot?: AutoFeatureSnapshot }> {
  if (!isAutoLine(lineOfBusiness)) return {};
  const snap = await loadAutoFeatureSnapshot(dealId);
  return snap ? { autoFeatureSnapshot: snap } : {};
}

export async function loadAutoFeatureSnapshot(dealId: string): Promise<AutoFeatureSnapshot | null> {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId)).limit(1);
  const sheets = await db
    .select()
    .from(quoteSheets)
    .where(
      and(
        eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
        eq(quoteSheets.dealId, dealId),
      ),
    );
  const autoSheet =
    sheets.find((s) => s.line.toLowerCase() === "auto") ??
    sheets.find((s) => s.line.toUpperCase() === "AUTO") ??
    null;
  if (!autoSheet && !risk) return null;
  return buildAutoFeatureSnapshot({
    sheetValues: autoSheet?.values ?? {},
    risk: risk ?? null,
  });
}
