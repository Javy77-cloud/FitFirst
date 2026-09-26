/**
 * Which policies the book Fill-from-DEC pass may touch.
 * Trained families follow the desk router (`fillFamilyForPolicy`):
 * HO3, Auto, DP1/DP3, Flood, and commercial WC / GL / E&O.
 * HO6, wind-only, MHO, BOP, life, and health stay out.
 * In force means active, bound, or pending. A previous fill is not a skip.
 */
import { isErrorsOmissionsProduct } from "@/lib/policy/eo";
import { fillFamilyForPolicy } from "@/lib/policy/fill-from-dec";
import { policyFormCode, type PolicyFormLabelInput } from "@/lib/policy/form-label";
import { HO3_BOOK_FILL_ACTOR, isBookHo3Policy } from "@/lib/policy/ho3-book";
import { resolveLobOverviewFamily } from "@/lib/policy/lob-overview";
import { isInForceStatus, policyStatusLabel } from "@/lib/policy/status";

/** Written on the fill audit for a mixed-family pass. Overwrite is allowed. */
export const BOOK_FILL_REASON =
  "Book Fill-from-DEC. Trained families: HO3, Auto, DP1/DP3, Flood, WC/GL/E&O. Overwrite on re-run.";

/** Same desk user as the HO3 pass. The script looks this name up; it does not invent an actor. */
export const BOOK_FILL_ACTOR = HO3_BOOK_FILL_ACTOR;

export const BOOK_FILL_FAMILIES = ["ho3", "auto", "dp", "flood", "commercial"] as const;
export type BookFillFamily = (typeof BOOK_FILL_FAMILIES)[number];
export type BookFillFamilyFilter = BookFillFamily | "all";

export type BookFillPolicyInput = PolicyFormLabelInput & {
  insuranceType?: string | null;
  /**
   * When present, ended and unpublished policies are excluded.
   * Omit it only in family-only checks.
   */
  status?: string | null;
};

const NO_DEC = "No declaration page on this policy.";

export function parseBookFillFamily(raw: string | null | undefined): BookFillFamilyFilter | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return null;
  if (value === "all") return "all";
  if ((BOOK_FILL_FAMILIES as readonly string[]).includes(value)) return value as BookFillFamily;
  return null;
}

function labeled(input: BookFillPolicyInput): string {
  return [input.formType, input.policySubType, input.subType, input.policyType, input.lineOfBusiness, input.insuranceType]
    .map((value) => value ?? "")
    .join(" ");
}

function formCodes(input: BookFillPolicyInput): string[] {
  const sub = input.policySubType ?? input.subType;
  return [input.formType, sub, input.policyType, input.lineOfBusiness]
    .map((value) => policyFormCode(value))
    .filter((code): code is string => Boolean(code));
}

function windOnly(input: BookFillPolicyInput): boolean {
  return /wind\s*only/i.test(labeled(input));
}

/** DP1 or DP3. A bare DP line is not enough. */
function trainedDp(input: BookFillPolicyInput): boolean {
  const codes = formCodes(input);
  return codes.includes("DP1") || codes.includes("DP3");
}

/**
 * Trained book family, or null when this pass must not fill the policy.
 * Flood, auto, and commercial come from the desk router.
 * Homeowners splits into HO3 and DP1/DP3. Everything else is untrained.
 */
export function bookFillFamily(input: BookFillPolicyInput): BookFillFamily | null {
  const routed = fillFamilyForPolicy(input);
  if (routed === "flood") return "flood";
  if (routed === "auto") return "auto";
  if (routed === "commercial") return "commercial";
  if (windOnly(input)) return null;
  if (routed !== "homeowners") return null;
  if (trainedDp(input)) return "dp";
  if (isBookHo3Policy(input)) return "ho3";
  return null;
}

/** Off-book and unpublished. Null when the policy is in force, or when status was not supplied. */
export function bookFillStatusExclusion(status: string | null | undefined): string | null {
  if (isInForceStatus(status ?? "")) return null;
  const raw = (status ?? "").trim();
  if (!raw) return "not active";
  return `not active (${policyStatusLabel(raw)})`;
}

/** Why a policy is outside the trained set. Not used once `bookFillFamily` returns a family. */
export function untrainedBookFillReason(input: BookFillPolicyInput): string {
  const text = labeled(input);
  if (windOnly(input)) return /ho\s*-?\s*3/i.test(text) ? "HO3 Wind Only" : "wind only";
  const codes = formCodes(input);
  if (codes.includes("HO6")) return "HO6";
  if (codes.includes("MHO")) return "MHO";
  const otherHo = codes.find((code) => /^HO[0-8]$/.test(code) && code !== "HO3");
  if (otherHo) return otherHo;
  if (
    codes.includes("E&O") ||
    isErrorsOmissionsProduct(
      input.formType,
      input.policySubType,
      input.subType,
      input.policyType,
      input.lineOfBusiness,
    )
  ) {
    return "E&O on an untrained line";
  }
  if (/\bMDP\b/i.test(text)) return "MDP";
  const line = (input.lineOfBusiness ?? "").trim().toUpperCase();
  const overview = resolveLobOverviewFamily(input);
  if (line === "DP") return "DP, not DP1/DP3";
  if (line === "BOP" || overview === "bop" || /\bbop\b/i.test(text)) return "BOP";
  if (line === "UMBRELLA" || line === "PU" || line === "PUP" || /\bumbrella\b/i.test(text)) return "umbrella";
  if (line === "LIFE" || overview === "life") return "life";
  if (line === "HEALTH" || overview === "health") return "health";
  if (line === "RV" || /\brv\b/i.test(text)) return "RV";
  if (/\b(boat|watercraft)\b/i.test(text)) return "boat";
  if (line === "COMMERCIAL" || line === "CPP" || line === "PACKAGE") return "commercial, not WC/GL/E&O";
  if (line === "HO" || overview === "homeowners" || /\bhome/i.test(text)) return "home, not form HO3";
  return "unsupported family";
}

export function classifyBookFillPolicy(
  input: BookFillPolicyInput,
  filter: BookFillFamilyFilter = "all",
): { family: BookFillFamily | null; exclude: string | null } {
  const family = bookFillFamily(input);
  if (input.status !== undefined) {
    const statusExclude = bookFillStatusExclusion(input.status);
    if (statusExclude) return { family, exclude: statusExclude };
  }
  if (!family) return { family: null, exclude: untrainedBookFillReason(input) };
  if (filter !== "all" && family !== filter) {
    return { family, exclude: `family ${family}; this pass is ${filter}` };
  }
  return { family, exclude: null };
}

/** Loader text the dry-run prints as `no DEC`. Other loader errors stay as written. */
export function bookFillDecNote(error: string): string {
  if (error === NO_DEC) return "no DEC";
  return error;
}

/**
 * Fill or exclude before the audit note. A previous fill is not an input:
 * overwrite is decided at apply time, same as Confirm on the desk.
 */
export function decideBookFill(input: {
  policy: BookFillPolicyInput;
  filter?: BookFillFamilyFilter;
  dec: { ok: true } | { ok: false; error: string };
}): { decision: "fill" | "exclude"; family: BookFillFamily | ""; note: string } {
  const classified = classifyBookFillPolicy(input.policy, input.filter ?? "all");
  const family = classified.family ?? "";
  if (classified.exclude) return { decision: "exclude", family, note: classified.exclude };
  if (!input.dec.ok) return { decision: "exclude", family, note: bookFillDecNote(input.dec.error) };
  return { decision: "fill", family, note: "" };
}
