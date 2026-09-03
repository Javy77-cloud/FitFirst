import { appointmentLine } from "@/lib/domain";
import { CARRIER_IDS } from "@/lib/fixtures/ids";

/**
 * Javy's first-wave Home (12) and Auto first 4.
 * Rank among fits only — not a pick list, not a filter.
 */
export const FIRST_WAVE_HOME = [
  "americanIntegrity",
  "tailrow",
  "sagesure",
  "geovera",
  "qbe",
  "benchmark",
  "hadron",
  "vave",
  "vyrd",
  "hoc",
  "heritage",
  "universal",
] as const;

export const FIRST_WAVE_AUTO = [
  "progressive",
  "travelers",
  "nationalGeneral",
  "foremost",
] as const;

const HOME_NAME_ALIASES: Record<(typeof FIRST_WAVE_HOME)[number], string[]> = {
  americanIntegrity: ["american integrity"],
  tailrow: ["tailrow"],
  sagesure: ["sagesure", "markel"],
  geovera: ["geovera"],
  qbe: ["qbe", "swyfft"],
  benchmark: ["benchmark"],
  hadron: ["hadron"],
  vave: ["vave", "lloyd"],
  vyrd: ["vyrd"],
  hoc: ["homeowners choice", "hoc"],
  heritage: ["heritage"],
  universal: ["universal property", "universal"],
};

const AUTO_NAME_ALIASES: Record<(typeof FIRST_WAVE_AUTO)[number], string[]> = {
  progressive: ["progressive"],
  travelers: ["travelers"],
  nationalGeneral: ["national general"],
  foremost: ["foremost"],
};

export function firstWaveKeys(dealLine: string): readonly string[] {
  return appointmentLine(dealLine) === "AUTO" ? FIRST_WAVE_AUTO : FIRST_WAVE_HOME;
}

export function firstWaveRank(
  dealLine: string,
  carrierId: string,
  carrierName: string,
): number | null {
  const keys = firstWaveKeys(dealLine);
  const aliases = appointmentLine(dealLine) === "AUTO" ? AUTO_NAME_ALIASES : HOME_NAME_ALIASES;
  const idHit = keys.findIndex((key) => {
    const id = (CARRIER_IDS as Record<string, string>)[key];
    return id === carrierId;
  });
  if (idHit >= 0) return idHit;

  const name = carrierName.toLowerCase();
  const nameHit = keys.findIndex((key) => {
    const labels = (aliases as Record<string, string[]>)[key] ?? [key.toLowerCase()];
    return labels.some((label) => name.includes(label));
  });
  return nameHit >= 0 ? nameHit : null;
}
