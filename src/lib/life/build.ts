/** Placeholder until Javy’s MATRIX height/weight tabs land. Do not invent carrier build charts. */
export const LIFE_BUILD_TABLE_PENDING_NOTE =
  "Height/weight (build/BMI) tables pending — full MATRIX when spreadsheet provided.";

export type LifeBuildInput = {
  heightFt?: string | null;
  heightIn?: string | null;
  weightLbs?: string | null;
};

export type LifeBuildSnapshot = {
  heightInches: number | null;
  weightLbs: number | null;
  bmi: number | null;
  /** Always unknown until MATRIX build tabs are imported. */
  band: "unknown";
  note: string;
};

function parseNumber(raw: string | null | undefined): number | null {
  const value = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function lifeBuildFromSheet(input: LifeBuildInput): LifeBuildSnapshot {
  const feet = parseNumber(input.heightFt);
  const inches = parseNumber(input.heightIn) ?? 0;
  const weightLbs = parseNumber(input.weightLbs);
  const heightInches = feet != null ? feet * 12 + inches : null;
  const bmi =
    heightInches && weightLbs ? Math.round((weightLbs / (heightInches * heightInches)) * 7030) / 10 : null;
  return {
    heightInches,
    weightLbs,
    bmi,
    band: "unknown",
    note: LIFE_BUILD_TABLE_PENDING_NOTE,
  };
}
