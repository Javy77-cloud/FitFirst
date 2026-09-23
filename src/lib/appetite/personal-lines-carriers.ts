/**
 * Personal-lines carriers from Javy notes 2026-09-22.
 * Data: src/data/appetite/personal-lines-carriers-2026-09-22.json
 * Source notes: /workspace/fitfirst-carrier-notes/personal-lines-carriers-2026-09-22.md
 *
 * Rule: "all 50" → territory US. Fewer than 50 → leave states blank (unknown which).
 * UW question densify into Risk Profile is PARKED (UW_QUESTIONS_RP_PARK).
 * Portal quoting is out of scope. American Modern = enrich-only, never duplicate.
 */
import catalogJson from "@/data/appetite/personal-lines-carriers-2026-09-22.json";

export const PERSONAL_LINES_NOTES_DATE = "2026-09-22";
export const PERSONAL_LINES_FIXTURE_TAG = "personal-lines-2026-09-22";

/** PARK: densify into Risk Profile after Policy issued UX package. Carriers first. */
export const UW_QUESTIONS_RP_PARK =
  "PARK — UW master questions (systems/4-point, pool, trampoline, dog breeds, fuel, flood, fire class, claims) densify into Risk Profile after Policy issued UX. Source: fitfirst-carrier-notes/uw-questions-master-2026-09-22.md.";

export type PersonalLinesCarrierSpec = {
  seedId: string;
  name: string;
  matchNeedles: string[];
  matchExclude?: string[];
  writtenLines: string[];
  territory: string;
  statesToken: string;
  tags: string[];
  likes: string;
  dislikes: string;
  specialtyNotes: string;
  dontWrite?: string;
  website?: string;
  enrichOnly?: boolean;
  appetiteLobs?: string[];
};

export const PERSONAL_LINES_CARRIERS = catalogJson as PersonalLinesCarrierSpec[];

function note(spec: PersonalLinesCarrierSpec): string {
  const footprint =
    spec.statesToken === "US"
      ? "All 50 states."
      : spec.statesToken
        ? `Footprint: ${spec.statesToken.replace(/\|/g, ", ")}.`
        : "Footprint under 50 states — exact list unknown; do not invent states.";
  return [
    `${spec.name}. ${footprint}`,
    `Writes: ${spec.writtenLines.join(", ")}.`,
    `Likes: ${spec.likes}.`,
    `Dislikes: ${spec.dislikes}.`,
    spec.specialtyNotes,
    spec.dontWrite ? `Don't write / limits: ${spec.dontWrite}.` : null,
    `Javy personal-lines notes ${PERSONAL_LINES_NOTES_DATE}. No UW mins invented.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function info(spec: PersonalLinesCarrierSpec): string {
  return `${spec.name}. ${spec.specialtyNotes} Likes ${spec.likes}. Dislikes ${spec.dislikes}.`;
}

export function personalLinesAppetiteNote(spec: PersonalLinesCarrierSpec): string {
  return note(spec);
}

export function personalLinesCarrierInfo(spec: PersonalLinesCarrierSpec): string {
  return info(spec);
}

export function personalLinesDontWrite(spec: PersonalLinesCarrierSpec): string | null {
  return spec.dontWrite ?? null;
}

export function matchesPersonalLinesName(
  name: string | null | undefined,
  spec: PersonalLinesCarrierSpec,
): boolean {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return false;
  if (spec.matchExclude?.some((ex) => n.includes(ex))) return false;
  // Word-boundary match so "erie" does not hit Coterie and "amica" does not hit Amicable.
  return spec.matchNeedles.some((needle) => {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(n);
  });
}

export function personalLinesSummary(existingNames: string[]): {
  alreadyPresent: string[];
  toAdd: string[];
  enrichOnly: string[];
} {
  const alreadyPresent: string[] = [];
  const toAdd: string[] = [];
  const enrichOnly: string[] = [];
  for (const spec of PERSONAL_LINES_CARRIERS) {
    const hit = existingNames.some((n) => matchesPersonalLinesName(n, spec));
    if (spec.enrichOnly) {
      enrichOnly.push(spec.name);
      if (hit) alreadyPresent.push(spec.name);
      continue;
    }
    if (hit) alreadyPresent.push(spec.name);
    else toAdd.push(spec.name);
  }
  return { alreadyPresent, toAdd, enrichOnly };
}
