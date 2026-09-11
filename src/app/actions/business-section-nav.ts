"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import {
  DEFAULT_BUSINESS_SECTION_NAV_IDS,
  isBusinessSectionId,
  normalizeBusinessSectionNavIds,
  type BusinessSectionId,
} from "@/lib/desk/business-sections";
import { saveAgencyBusinessSectionNav } from "@/lib/businesses/business-section-nav-prefs";

export async function saveBusinessSectionNav(selectedIds: string[]) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const cleaned = normalizeBusinessSectionNavIds(
    selectedIds.filter((id): id is BusinessSectionId => isBusinessSectionId(id)),
  );
  const saved = await saveAgencyBusinessSectionNav(cleaned);
  revalidatePath("/accounts");
  return saved;
}

export async function resetBusinessSectionNav() {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const saved = await saveAgencyBusinessSectionNav(null);
  revalidatePath("/accounts");
  return saved.length ? saved : [...DEFAULT_BUSINESS_SECTION_NAV_IDS];
}
