import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";
import {
  DEFAULT_CONTACT_SECTION_NAV_IDS,
  normalizeContactSectionNavIds,
  type ContactSectionId,
} from "@/lib/desk/contact-sections";

export async function getAgencyContactSectionNav(): Promise<ContactSectionId[]> {
  try {
    const [row] = await db
      .select({ contactSectionNav: agencySettings.contactSectionNav })
      .from(agencySettings)
      .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
      .limit(1);
    return normalizeContactSectionNavIds(row?.contactSectionNav ?? null);
  } catch {
    // Column may be mid-migrate; never crash the contact page for nav prefs.
    return [...DEFAULT_CONTACT_SECTION_NAV_IDS];
  }
}

export async function saveAgencyContactSectionNav(
  ids: ContactSectionId[] | null,
): Promise<ContactSectionId[]> {
  const next = ids == null ? null : normalizeContactSectionNavIds(ids);
  const stored = next ?? null;
  const [existing] = await db
    .select({ id: agencySettings.id })
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID))
    .limit(1);
  if (existing) {
    await db
      .update(agencySettings)
      .set({ contactSectionNav: stored, updatedAt: new Date() })
      .where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      contactSectionNav: stored,
    });
  }
  return next ?? [...DEFAULT_CONTACT_SECTION_NAV_IDS];
}
