import {
  createFieldPicklist,
  listFieldPicklists,
  updateFieldPicklist,
} from "@/lib/custom-fields/picklist-store";
import type { FieldPicklist } from "@/lib/custom-fields/picklists";
import {
  STARTER_PICKLIST_CONTACT_METHOD,
  STARTER_PICKLIST_CONTACT_TIME,
  STARTER_PICKLIST_EDUCATION,
  STARTER_PICKLIST_EMPLOYMENT,
  STARTER_PICKLIST_LEAD_SOURCE,
  STARTER_PICKLIST_MARITAL_STATUS,
  STARTER_PICKLIST_POLICY_SUBTYPES,
  STARTER_PICKLIST_RECENT_LIFE_EVENTS,
  matchStarterList,
  starterPicklistByName,
} from "@/lib/custom-fields/starter-picklists";
import { LEAD_SOURCES } from "@/lib/crm/sources";

/**
 * Contact Detail fields → reusable Global Lists (Settings → Picklists).
 * Lead Source consolidates any legacy "Source" / "Business Source" lists.
 */
export const CONTACT_DETAIL_PICKLIST_BINDINGS = [
  {
    fieldKey: "recent_life_events",
    picklistName: STARTER_PICKLIST_RECENT_LIFE_EVENTS,
    type: "multi_select" as const,
  },
  {
    fieldKey: "existing_coverage_types",
    picklistName: STARTER_PICKLIST_POLICY_SUBTYPES,
    type: "multi_select" as const,
  },
  {
    fieldKey: "marital_status",
    picklistName: STARTER_PICKLIST_MARITAL_STATUS,
    type: "picklist" as const,
  },
  {
    fieldKey: "source",
    picklistName: STARTER_PICKLIST_LEAD_SOURCE,
    type: "picklist" as const,
  },
  {
    fieldKey: "education_level",
    picklistName: STARTER_PICKLIST_EDUCATION,
    type: "picklist" as const,
  },
  {
    fieldKey: "employment_status",
    picklistName: STARTER_PICKLIST_EMPLOYMENT,
    type: "picklist" as const,
  },
  {
    fieldKey: "preferred_contact_method",
    picklistName: STARTER_PICKLIST_CONTACT_METHOD,
    type: "picklist" as const,
  },
  {
    fieldKey: "preferred_contact_time",
    picklistName: STARTER_PICKLIST_CONTACT_TIME,
    type: "picklist" as const,
  },
] as const;

const LEAD_SOURCE_ALIASES = ["Lead Source", "Source", "Business Source", "Lead Sources"];

async function ensureNamedPicklist(name: string): Promise<FieldPicklist | null> {
  try {
    const lists = await listFieldPicklists();
    const starter = starterPicklistByName(name);
    const seed = starter?.options ?? [];

    if (name === STARTER_PICKLIST_LEAD_SOURCE) {
      const bySeed = starter ? matchStarterList(lists, starter) : undefined;
      const aliases = lists.filter((list) =>
        LEAD_SOURCE_ALIASES.some((alias) => list.name.trim().toLowerCase() === alias.toLowerCase()),
      );
      const leadNamed = aliases.find((list) => list.name.trim().toLowerCase() === "lead source");
      const preferred = bySeed ?? leadNamed ?? aliases[0];
      const merged = Array.from(
        new Set([
          ...seed,
          ...LEAD_SOURCES,
          ...aliases.flatMap((list) => list.options.map((option) => option.value)),
        ]),
      );
      if (preferred) {
        const patch: { options?: string[]; seedKey?: string } = {};
        // Keep a user rename. Only fill empty options / backfill seed key.
        if (!preferred.seedKey && starter?.seedKey) patch.seedKey = starter.seedKey;
        if (preferred.options.length === 0 && merged.length) {
          patch.options = merged;
        }
        if (Object.keys(patch).length) {
          return (await updateFieldPicklist(preferred.id, patch)) ?? preferred;
        }
        return preferred;
      }
      return await createFieldPicklist(STARTER_PICKLIST_LEAD_SOURCE, merged.length ? merged : [...LEAD_SOURCES], {
        seedKey: starter?.seedKey,
      });
    }

    const found = starter
      ? matchStarterList(lists, starter)
      : lists.find((list) => list.name.trim().toLowerCase() === name.toLowerCase());
    if (found) {
      if (found.options.length === 0 && seed.length) {
        return (await updateFieldPicklist(found.id, { options: seed, seedKey: found.seedKey ?? starter?.seedKey })) ?? found;
      }
      return found;
    }
    return await createFieldPicklist(name, seed, { seedKey: starter?.seedKey });
  } catch {
    return null;
  }
}

export async function ensureContactDetailPicklists(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const row of CONTACT_DETAIL_PICKLIST_BINDINGS) {
    const list = await ensureNamedPicklist(row.picklistName);
    if (list?.id) out[row.fieldKey] = list.id;
  }
  return out;
}
