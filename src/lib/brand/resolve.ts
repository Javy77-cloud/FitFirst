import {
  AGENCY_BRAND,
  COLOR_PRESETS,
  DENSITY_PRESETS,
  FONT_PRESETS,
  defaultColumnLayout,
  type ColorPreset,
  type ColumnLayout,
  type DensityPreset,
  type FontPreset,
} from "@/lib/domain";
import type { AgencyBrand, AgentUiPref } from "@/lib/db/schema";

export type ResolvedUiPrefs = {
  agencyName: string;
  logoUrl: string | null;
  colorPreset: ColorPreset;
  fontPreset: FontPreset;
  density: DensityPreset;
  columnLayout: ColumnLayout;
  colorSource: "agency" | "agent";
};

function asColor(value: string | null | undefined, fallback: ColorPreset): ColorPreset {
  if (value && (COLOR_PRESETS as readonly string[]).includes(value)) return value as ColorPreset;
  return fallback;
}

function asFont(value: string | null | undefined, fallback: FontPreset): FontPreset {
  if (value && (FONT_PRESETS as readonly string[]).includes(value)) return value as FontPreset;
  return fallback;
}

function asDensity(value: string | null | undefined, fallback: DensityPreset): DensityPreset {
  if (value && (DENSITY_PRESETS as readonly string[]).includes(value)) {
    return value as DensityPreset;
  }
  return fallback;
}

function mergeLayout(
  agency: ColumnLayout | null | undefined,
  agent: ColumnLayout | null | undefined,
): ColumnLayout {
  const base = { ...defaultColumnLayout(), ...(agency ?? {}) };
  if (!agent) return base;
  return { ...base, ...agent };
}

export function resolveUiPrefs(
  brand: AgencyBrand | null,
  agent: AgentUiPref | null,
): ResolvedUiPrefs {
  const agencyColor = asColor(brand?.defaultColorPreset, "agency");
  const agencyFont = asFont(brand?.defaultFontPreset, "plex");
  const agencyDensity = asDensity(brand?.defaultDensity, "comfortable");
  const colorPreset = asColor(agent?.colorPreset, agencyColor);
  return {
    agencyName: brand?.agencyName || AGENCY_BRAND.name,
    logoUrl: brand?.logoStoragePath ? "/api/brand/logo" : null,
    colorPreset,
    fontPreset: asFont(agent?.fontPreset, agencyFont),
    density: asDensity(agent?.density, agencyDensity),
    columnLayout: mergeLayout(brand?.defaultColumnLayout, agent?.columnLayout),
    colorSource: agent?.colorPreset ? "agent" : "agency",
  };
}
