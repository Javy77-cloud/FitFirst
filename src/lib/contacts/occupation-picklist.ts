import { OCCUPATION_OPTIONS } from "@/lib/quote-sheet/applicant-core";
import {
  createFieldPicklist,
  listFieldPicklists,
  updateFieldPicklist,
} from "@/lib/custom-fields/picklist-store";
import type { FieldPicklist } from "@/lib/custom-fields/picklists";

/** Global shared Settings → Picklists name. Used by Contacts, Deals, Leads. */
export const OCCUPATION_PICKLIST_NAME = "Occupations";

export function isOccupationPicklistName(name: string): boolean {
  return name.trim().toLowerCase() === OCCUPATION_PICKLIST_NAME.toLowerCase();
}

/** Seed values for the Occupations global list (starter catalog only — UI reads the DB list). */
export const OCCUPATION_PICKLIST_SEED = [...OCCUPATION_OPTIONS];

/**
 * Ensure the Occupations global picklist exists (create or fill if empty).
 * Returns the live list so callers never hardcode options in Contact/Deal/Lead UI.
 */
export async function ensureOccupationPicklist(): Promise<FieldPicklist | null> {
  try {
    const lists = await listFieldPicklists();
    const found = lists.find((list) => isOccupationPicklistName(list.name));
    if (found) {
      if (found.options.length === 0) {
        return (
          (await updateFieldPicklist(found.id, { options: OCCUPATION_PICKLIST_SEED })) ?? found
        );
      }
      return found;
    }
    return await createFieldPicklist(OCCUPATION_PICKLIST_NAME, OCCUPATION_PICKLIST_SEED);
  } catch {
    return null;
  }
}

/** Option labels from the global Occupations picklist (empty if unavailable). */
export async function occupationPicklistOptionValues(): Promise<string[]> {
  const list = await ensureOccupationPicklist();
  return (list?.options ?? []).map((opt) => opt.value).filter(Boolean);
}

export async function occupationPicklistId(): Promise<string | null> {
  const list = await ensureOccupationPicklist();
  return list?.id ?? null;
}
