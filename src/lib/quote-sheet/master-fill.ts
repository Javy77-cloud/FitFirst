/** One-button Risk Profile Fill — Home: Deal → Property → Docs; Auto: Deal → Docs → VIN. */

import { FILL_RISK_PROFILE_LABEL, FILLING_RISK_PROFILE_TITLE } from "./risk-profile-copy";

export const FILL_MASTER_SHEET_LABEL = FILL_RISK_PROFILE_LABEL;

export const MASTER_FILL_STEP_DEAL = "Deal";
export const MASTER_FILL_STEP_PROPERTY = "Property";
export const MASTER_FILL_STEP_DOCS = "Docs";
export const MASTER_FILL_STEP_VIN = "VIN";

export const MASTER_FILL_SKIP_NO_DOCS = "No docs uploaded — skipped";
export const MASTER_FILL_SKIP_NO_ADDRESS = "No property address — skipped";
export const MASTER_FILL_SKIP_NO_DEAL = "No deal details to copy — skipped";
export const MASTER_FILL_SKIP_NEEDS_KEY = "Property records key missing — skipped";
export const MASTER_FILL_SKIP_NOT_FOUND = "Property records not found — skipped";
/** Auto Fill never runs Home property / FEMA — VIN decode is the Auto enrichment step. */
export const MASTER_FILL_SKIP_AUTO_PROPERTY =
  "Auto skips property records — VIN decode runs after docs";
export const MASTER_FILL_SKIP_NO_VIN = "No VIN on sheet — skipped";

/** Done-state nudge: filled cells stay CHECK until the agent Confirms. */
export const MASTER_FILL_REVIEW_NUDGE =
  "Review CHECK fields and Confirm when ready";

/** Fallback dialog title. WaitHold title tracks the live step instead. */
export const MASTER_FILL_BUSY_TITLE = FILLING_RISK_PROFILE_TITLE;
export const MASTER_FILL_BUSY_COPY = "Working on it — we’ll be back soon.";
export const MASTER_FILL_UNEXPECTED =
  "Unexpected response from server. Fields already filled are saved.";
export const MASTER_FILL_DOCS_FAILED =
  "Could not read docs. Fields already filled are saved.";
export const MASTER_FILL_CANCEL = "Cancel";

export type MasterFillStepId = "deal" | "property" | "docs" | "vin";

export type MasterFillStepResult = {
  step: MasterFillStepId;
  filledCount: number;
  skippedCount: number;
  note?: string;
  error?: string;
};

/** Home / property LOBs: Deal → Property → Docs. Auto: Deal → Docs → VIN (no FEMA). */
export function masterFillStepsForLine(line: string): { id: MasterFillStepId; label: string }[] {
  if (line === "auto") {
    return [
      { id: "deal", label: MASTER_FILL_STEP_DEAL },
      { id: "docs", label: MASTER_FILL_STEP_DOCS },
      { id: "vin", label: MASTER_FILL_STEP_VIN },
    ];
  }
  return [
    { id: "deal", label: MASTER_FILL_STEP_DEAL },
    { id: "property", label: MASTER_FILL_STEP_PROPERTY },
    { id: "docs", label: MASTER_FILL_STEP_DOCS },
  ];
}

export function masterFillBusyTitle(stepLabel: string): string {
  return stepLabel.trim() || MASTER_FILL_BUSY_TITLE;
}

export function isMasterFillStepResult(raw: unknown): raw is MasterFillStepResult {
  if (!raw || typeof raw !== "object") return false;
  const value = raw as Partial<MasterFillStepResult>;
  return (
    (value.step === "deal" ||
      value.step === "property" ||
      value.step === "docs" ||
      value.step === "vin") &&
    typeof value.filledCount === "number" &&
    typeof value.skippedCount === "number"
  );
}

export function masterFillUnexpectedMessage(stepLabel: string): string {
  return `${stepLabel} failed — ${MASTER_FILL_UNEXPECTED}`;
}

export function isMasterFillAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  const message = error instanceof Error ? error.message : "";
  return name === "AbortError" || /aborted/i.test(message);
}

/** Lose the client race when the user cancels — the server step may still finish. */
export function rejectWhenAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const fail = () => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      reject(error);
    };
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener("abort", fail, { once: true });
  });
}

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
