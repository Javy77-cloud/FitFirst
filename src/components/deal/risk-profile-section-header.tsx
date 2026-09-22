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
    /* eslint-disable react-hooks/set-state-in-effect -- restore per-user density from localStorage */
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
  collapsed,
  onToggleCollapse,
}: {
  title: string;
  sectionId: string;
  density: RiskProfileDensity;
  onDensityChange: (density: RiskProfileDensity) => void;
  extra?: ReactNode;
  choices?: readonly RiskProfileDensity[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div
      className={sheetGroupHeaderClass(title)}
      style={SHEET_GROUP_HEADER_STYLE}
      data-ff-sheet-group-header={title}
    >
      <span className="flex min-w-0 items-center gap-2">
        {onToggleCollapse ? (
          <button
            type="button"
            className="shrink-0 rounded-sm border border-white/40 px-1.5 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-white"
            data-ff-section-toggle={title}
            aria-expanded={collapsed ? "false" : "true"}
            onClick={onToggleCollapse}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        ) : null}
        <span className="ff-sheet-group-title min-w-0" data-ff-section-title={title}>
          {title}
        </span>
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
