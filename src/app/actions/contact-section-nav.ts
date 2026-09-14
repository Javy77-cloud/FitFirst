"use server";

import { revalidatePath } from "next/cache";
import { currentDeskSession } from "@/lib/auth/session";
import {
  DEFAULT_CONTACT_SECTION_NAV_IDS,
  isContactSectionId,
  normalizeContactSectionNavIds,
  type ContactSectionId,
} from "@/lib/desk/contact-sections";
import { saveAgencyContactSectionNav } from "@/lib/contacts/contact-section-nav-prefs";

export async function saveContactSectionNav(selectedIds: string[]) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const cleaned = normalizeContactSectionNavIds(
    selectedIds.filter((id): id is ContactSectionId => isContactSectionId(id)),
  );
  const saved = await saveAgencyContactSectionNav(cleaned);
  revalidatePath("/contacts");
  return saved;
}

export async function resetContactSectionNav() {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in required.");
  const saved = await saveAgencyContactSectionNav(null);
  revalidatePath("/contacts");
  return saved.length ? saved : [...DEFAULT_CONTACT_SECTION_NAV_IDS];
}
