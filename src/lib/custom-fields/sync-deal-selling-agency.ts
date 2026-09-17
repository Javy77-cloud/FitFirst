import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deskCustomFields, globalLists } from "@/lib/db/schema";
import { DEAL_SELLING_AGENCY_KEY } from "@/lib/deals/selling-agency";

/** List + Details Selling agency options follow Global lists → Selling agencies. */
export async function syncDealSellingAgencyFromGlobalLists(tenantId = DEFAULT_TENANT_ID) {
  const rows = await db
    .select({ label: globalLists.label, color: globalLists.color })
    .from(globalLists)
    .where(
      and(
        eq(globalLists.tenantId, tenantId),
        eq(globalLists.listKey, "selling_agency"),
        eq(globalLists.active, true),
      ),
    );

  const options = rows
    .map((row) => ({
      value: row.label,
      color: row.color,
      isDefault: false as const,
    }))
    .sort((a, b) => a.value.localeCompare(b.value));

  await db
    .update(deskCustomFields)
    .set({
      picklistId: null,
      globalListKey: "selling_agency",
      required: true,
      // Rich options are already stored for this field; schema typing lags as string[].
      options: options as unknown as string[],
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(deskCustomFields.tenantId, tenantId),
        inArray(deskCustomFields.module, ["deals", "leads"]),
        eq(deskCustomFields.key, DEAL_SELLING_AGENCY_KEY),
      ),
    );
}
