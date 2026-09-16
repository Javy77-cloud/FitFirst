import type { FitBand } from "@/lib/domain";
import type { CarrierMatch, MatchReason } from "./match";

export type AppetiteAction = "shop" | "caution" | "dont_write";

export const APPETITE_ACTION_LABEL: Record<AppetiteAction, string> = {
  shop: "Shop",
  caution: "Caution",
  dont_write: "Don't write",
};

export const APPETITE_BAND_COPY: Record<FitBand, string> = {
  green: "Shop",
  yellow: "Caution",
  red: "Don't write",
};

/** Presentation only. Does not change filter-first matching. */
export function appetiteAction(band: FitBand): AppetiteAction {
  if (band === "green") return "shop";
  if (band === "yellow") return "caution";
  return "dont_write";
}

export function appetiteActionLabel(band: FitBand): string {
  return APPETITE_BAND_COPY[band];
}

export function isAppointedMatch(match: Pick<CarrierMatch, "reasons">): boolean {
  return !match.reasons.some((reason) => reason.code === "not_appointed");
}

export function appointmentLabel(match: Pick<CarrierMatch, "reasons">): string {
  return isAppointedMatch(match) ? "Appointed" : "Not appointed";
}

export function dontWriteNote(match: Pick<CarrierMatch, "reasons">): string | null {
  return match.reasons.find((reason) => reason.code === "dont_write")?.message ?? null;
}

export function appetiteNote(match: Pick<CarrierMatch, "reasons">): string | null {
  return match.reasons.find((reason) => reason.code === "appetite_note")?.message ?? null;
}

export function failReasons(reasons: MatchReason[]): MatchReason[] {
  return reasons.filter((reason) => reason.severity === "fail");
}

export function stretchReasons(reasons: MatchReason[]): MatchReason[] {
  return reasons.filter((reason) => reason.severity === "stretch");
}

export function marketWhy(match: CarrierMatch): string {
  const note = appetiteNote(match) || dontWriteNote(match);
  const blockers = match.reasons
    .filter((reason) => reason.severity !== "pass" && reason.code !== "dont_write" && reason.code !== "appetite_note")
    .map((reason) => reason.message);
  if (blockers.length) return blockers.join(" · ");
  if (note) return note;
  return "Clears structured appetite.";
}
