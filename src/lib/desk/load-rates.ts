import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { commissionRateSettings } from "@/lib/db/schema";
import { ratesFromRows, type CommissionRates } from "@/lib/desk/commission-line";

export async function loadCommissionRates(): Promise<CommissionRates> {
  const rows = await db
    .select()
    .from(commissionRateSettings)
    .where(eq(commissionRateSettings.tenantId, DEFAULT_TENANT_ID));
  return ratesFromRows(rows);
}
