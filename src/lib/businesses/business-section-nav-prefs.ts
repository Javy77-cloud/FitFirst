import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";
import {
  DEFAULT_BUSINESS_SECTION_NAV_IDS,
  normalizeBusinessSectionNavIds,
  type BusinessSectionId,
} from "@/lib/desk/business-sections";

export async function getAgencyBusinessSectionNav(): Promise<BusinessSectionId[]> {
  try {
    const [row] = await db
      .select({ businessSectionNav: agencySettings.businessSectionNav })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
      .limit(1);
    return normalizeBusinessSectionNavIds(row?.businessSectionNav ?? null);
  } catch {
    // Column may be mid-migrate; never crash the business page for nav prefs.
    return [...DEFAULT_BUSINESS_SECTION_NAV_IDS];
  }
}

export async function saveAgencyBusinessSectionNav(
  ids: BusinessSectionId[] | null,
): Promise<BusinessSectionId[]> {
  const next = ids == null ? null : normalizeBusinessSectionNavIds(ids);
  const stored = next ?? null;
  const [existing] = await db
    .select({ id: agencySettings.id })
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
    .limit(1);
  if (existing) {
    await db
      .update(agencySettings)
      .set({ businessSectionNav: stored, updatedAt: new Date() })
      .where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      businessSectionNav: stored,
    });
  }
  return next ?? [...DEFAULT_BUSINESS_SECTION_NAV_IDS];
}
