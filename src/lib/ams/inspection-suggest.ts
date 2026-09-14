import type { InspectionKind } from "@/lib/domain-ams";

/** Suggest next inspection date by kind + state (FL coastal bias for wind/roof). Honest stub calendar math. */
export function suggestNextInspectionDate(input: {
  kind: InspectionKind | string;
  state?: string | null;
  from?: Date;
}): Date {
  const from = input.from ?? new Date();
  const state = (input.state ?? "FL").toUpperCase();
  const kind = input.kind;
  let months = 12;
  if (kind === "wind_mit" || kind === "roof") {
    months = state === "FL" || state === "TX" || state === "LA" ? 36 : 60;
  } else if (kind === "four_point" || kind === "4_point") {
    months = 60;
  } else if (kind === "photo") {
    months = 12;
  }
  return new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate()),
  );
}

export function suggestInspectionDateIso(input: {
  kind: InspectionKind | string;
  state?: string | null;
  from?: Date;
}): string {
  return suggestNextInspectionDate(input).toISOString().slice(0, 10);
}
