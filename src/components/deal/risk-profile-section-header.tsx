"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SectionDensityControl } from "@/components/custom-fields/section-density-control";
import {
  defaultRiskProfileSectionDensity,
  readStoredRiskProfileDensity,
  RISK_PROFILE_DENSITIES,
  riskProfileSectionDensityId,
  writeStoredRiskProfileDensity,
  type RiskProfileDensity,
} from "@/lib/quote-sheet/risk-profile-layout";
import { SHEET_GROUP_HEADER_STYLE, sheetGroupHeaderClass } from "@/lib/quote-sheet/sheet-group-style";

export function useRiskProfileSectionDensity(title: string): {
  sectionId: string;
  density: RiskProfileDensity;
  setDensity: (density: RiskProfileDensity) => void;
} {
  const sectionId = riskProfileSectionDensityId(title);
  const fallback = defaultRiskProfileSectionDensity(title);
  const [density, setDensityState] = useState<RiskProfileDensity>(fallback);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- restore per-section density from session */
    const stored = readStoredRiskProfileDensity(sectionId);
    if (stored) setDensityState(stored);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sectionId]);

  function setDensity(next: RiskProfileDensity) {
    setDensityState(next);
    writeStoredRiskProfileDensity(sectionId, next);
  }

  return { sectionId, density, setDensity };
}

export function RiskProfileSectionBar({
  title,
  sectionId,
  density,
  onDensityChange,
  extra,
}: {
  title: string;
  sectionId: string;
  density: RiskProfileDensity;
  onDensityChange: (density: RiskProfileDensity) => void;
  extra?: ReactNode;
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
        choices={RISK_PROFILE_DENSITIES}
        tone="onDark"
      />
    </div>
  );
}
