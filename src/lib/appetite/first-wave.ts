import { appointmentLine } from "@/lib/domain";
import { CARRIER_IDS } from "@/lib/fixtures/ids";

/**
 * Javy's first-wave Home (12), Auto (8), and Flood (4) shop templates.
 * Rank among fits only — not a pick list, not a filter.
 * Auto + Flood templates (2026-09-10) until appetite predicts those markets.
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
  "libertyMutual",
  "bristolWest",
  "allstate",
  "geico",
  "progressive",
  "travelers",
  "theGeneral",
  "nationwide",
] as const;

/** Locked Flood markets (2026-09-23). Neptune · Selective · Tower Hill · Wright. Not Hartford / Beyond / Flow. */
export const FIRST_WAVE_FLOOD = [
  "neptune",
  "selective",
  "towerHill",
  "wright",
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
  libertyMutual: ["liberty mutual", "liberty"],
  bristolWest: ["bristol west", "bristol"],
  allstate: ["allstate"],
  geico: ["geico"],
  progressive: ["progressive"],
  travelers: ["travelers"],
  theGeneral: ["the general", "general automobile", "permanent general"],
  nationwide: ["nationwide"],
};

/** Match carrier display names in DB for Flood first-wave rank / shop load. */
export const FLOOD_NAME_ALIASES: Record<(typeof FIRST_WAVE_FLOOD)[number], string[]> = {
  neptune: ["neptune"],
  selective: ["selective"],
  towerHill: ["tower hill"],
  wright: ["wright national", "wright flood", "wright"],
};

function aliasesForLine(dealLine: string): Record<string, string[]> {
  const line = appointmentLine(dealLine);
  if (line === "AUTO") return AUTO_NAME_ALIASES;
  if (line === "FLOOD") return FLOOD_NAME_ALIASES;
  return HOME_NAME_ALIASES;
}

export function firstWaveKeys(dealLine: string): readonly string[] {
  const line = appointmentLine(dealLine);
  if (line === "AUTO") return FIRST_WAVE_AUTO;
  if (line === "FLOOD") return FIRST_WAVE_FLOOD;
  return FIRST_WAVE_HOME;
}

export function firstWaveRank(
  dealLine: string,
  carrierId: string,
  carrierName: string,
): number | null {
  const keys = firstWaveKeys(dealLine);
  const aliases = aliasesForLine(dealLine);
  const idHit = keys.findIndex((key) => {
    const id = (CARRIER_IDS as Record<string, string>)[key];
    return id === carrierId;
  });
  if (idHit >= 0) return idHit;

  const name = carrierName.toLowerCase();
  const nameHit = keys.findIndex((key) => {
    const labels = aliases[key] ?? [key.toLowerCase()];
    return labels.some((label) => name.includes(label));
  });
  return nameHit >= 0 ? nameHit : null;
}
