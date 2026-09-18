"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SectionDensityControl } from "@/components/custom-fields/section-density-control";
import {
  clampRiskProfileDensity,
  defaultRiskProfileSectionDensity,
  readStoredRiskProfileDensity,
  RISK_PROFILE_LONG_TEXT_MAX,
  riskProfileSectionChoices,
  riskProfileSectionDensityId,
  writeStoredRiskProfileDensity,
  type RiskProfileDensity,
} from "@/lib/quote-sheet/risk-profile-layout";
import { SHEET_GROUP_HEADER_STYLE, sheetGroupHeaderClass } from "@/lib/quote-sheet/sheet-group-style";

export function useRiskProfileSectionDensity(
  title: string,
  maxColumns: RiskProfileDensity = RISK_PROFILE_LONG_TEXT_MAX,
): {
  sectionId: string;
  density: RiskProfileDensity;
  setDensity: (density: RiskProfileDensity) => void;
  choices: readonly RiskProfileDensity[];
} {
  const sectionId = riskProfileSectionDensityId(title);
  const fallback = clampRiskProfileDensity(defaultRiskProfileSectionDensity(title), maxColumns);
  const [density, setDensityState] = useState<RiskProfileDensity>(fallback);
  const choices = riskProfileSectionChoices(maxColumns);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- restore per-section density from session */
    const stored = readStoredRiskProfileDensity(sectionId);
    if (stored) setDensityState(clampRiskProfileDensity(stored, maxColumns));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sectionId, maxColumns]);

  function setDensity(next: RiskProfileDensity) {
    const clamped = clampRiskProfileDensity(next, maxColumns);
    setDensityState(clamped);
    writeStoredRiskProfileDensity(sectionId, clamped);
  }

  return { sectionId, density: clampRiskProfileDensity(density, maxColumns), setDensity, choices };
}

export function RiskProfileSectionBar({
  title,
  sectionId,
  density,
  onDensityChange,
  extra,
  choices,
}: {
  title: string;
  sectionId: string;
  density: RiskProfileDensity;
  onDensityChange: (density: RiskProfileDensity) => void;
  extra?: ReactNode;
  choices?: readonly RiskProfileDensity[];
}) {
  return (
    <div
      className={sheetGroupHeaderClass(title)}
      style={SHEET_GROUP_HEADER_STYLE}
      data-ff-sheet-group-header={title}
    >
      <span className="min-w-0">
        {title}
        {extra}
      </span>
      <SectionDensityControl
        sectionId={sectionId}
        density={density}
        onChange={onDensityChange}
        choices={choices ?? riskProfileSectionChoices(RISK_PROFILE_LONG_TEXT_MAX)}
        tone="onDark"
        label="Columns"
      />
    </div>
  );
}
