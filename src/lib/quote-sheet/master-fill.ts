/** One-button master sheet Fill — Deal → Property → Docs. */

export const FILL_MASTER_SHEET_LABEL = "Fill master sheet";

export const MASTER_FILL_STEP_DEAL = "Loading deal details…";
export const MASTER_FILL_STEP_PROPERTY = "Loading property details…";
export const MASTER_FILL_STEP_DOCS = "Loading docs…";

export const MASTER_FILL_SKIP_NO_DOCS = "No docs uploaded — skipped";
export const MASTER_FILL_SKIP_NO_ADDRESS = "No property address — skipped";
export const MASTER_FILL_SKIP_NO_DEAL = "No deal details to copy — skipped";
export const MASTER_FILL_SKIP_NEEDS_KEY = "Property records key missing — skipped";
export const MASTER_FILL_SKIP_NOT_FOUND = "Property records not found — skipped";

/** Done-state nudge: filled cells stay CHECK until the agent Confirms. */
export const MASTER_FILL_REVIEW_NUDGE =
  "Review CHECK fields and Confirm when ready";

/** Shown under Deal → Property → Docs while Fill is in flight (~20s). */
export const MASTER_FILL_BUSY_COPY =
  "Hold on — give us about 20 seconds to get this ready for you.";

export type MasterFillStepId = "deal" | "property" | "docs";

export type MasterFillStepResult = {
  step: MasterFillStepId;
  filledCount: number;
  skippedCount: number;
  note?: string;
  error?: string;
};

export function masterFillDoneSummary(steps: MasterFillStepResult[]): string {
  const filled = steps.reduce((sum, step) => sum + step.filledCount, 0);
  const skipped = steps.reduce((sum, step) => sum + step.skippedCount, 0);
  const notes = steps.map((step) => step.note).filter(Boolean);
  const errors = steps.map((step) => step.error).filter(Boolean);
  const bits: string[] = [];
  if (errors.length) bits.push(errors.join(" · "));
  if (filled > 0 || skipped > 0) {
    bits.push(`Filled ${filled}, skipped ${skipped}`);
  } else if (!notes.length && !errors.length) {
    bits.push("Nothing to fill");
  }
  if (notes.length) bits.push(notes.join(" · "));
  bits.push(MASTER_FILL_REVIEW_NUDGE);
  return bits.join(". ");
}
