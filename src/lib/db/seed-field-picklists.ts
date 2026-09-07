import { ensureDefaultFieldPicklists } from "@/lib/custom-fields/picklist-store";

/** Additive starter catalog. Does not wipe CRM rows. */
export async function seedFieldPicklists() {
  await ensureDefaultFieldPicklists();
}
