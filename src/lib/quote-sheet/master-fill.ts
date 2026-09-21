/** One-button Risk Profile Fill — Home: Deal → Property → Docs; Auto: Deal → Docs → VIN. */

import { withDeadline } from "@/lib/async/deadline";
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

export type MasterFillStepId = "deal" | "property" | "docs" | "vin";

/**
 * Hard ceilings for Fill Risk Profile. The Docs server action used to await
 * Tesseract / a Gemini body with no caller deadline, so the modal stayed on
 * "Docs — Working on it". Client waits sit a little above the server budgets
 * so a finished action wins, and still end the spinner if the action never resolves.
 */
export const MASTER_FILL_DOCS_TIMEOUT_MS = 52_000;
export const MASTER_FILL_VIN_TIMEOUT_MS = 48_000;
export const MASTER_FILL_CLIENT_TIMEOUT_MS: Record<MasterFillStepId, number> = {
  deal: 15_000,
  property: 30_000,
  docs: 58_000,
  vin: 56_000,
};

export const MASTER_FILL_DOCS_TIMEOUT_MESSAGE =
  "Docs timed out. Fields already filled are saved.";
export const MASTER_FILL_VIN_TIMEOUT_MESSAGE =
  "VIN timed out. NHTSA vPIC did not respond. Fields already filled are saved.";

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

export function masterFillClientTimeoutMs(step: MasterFillStepId): number {
  return MASTER_FILL_CLIENT_TIMEOUT_MS[step];
}

export function masterFillStepTimeoutMessage(step: MasterFillStepId, label: string): string {
  if (step === "docs") return MASTER_FILL_DOCS_TIMEOUT_MESSAGE;
  if (step === "vin") return MASTER_FILL_VIN_TIMEOUT_MESSAGE;
  return `${label} timed out. Fields already filled are saved.`;
}

/** Toast when any step failed. Includes cells already written so a VIN hang does not hide Docs. */
export function masterFillFailureToast(steps: MasterFillStepResult[]): string {
  const errors = steps.map((step) => step.error).filter((error): error is string => Boolean(error));
  const filled = steps.reduce((sum, step) => sum + step.filledCount, 0);
  const skipped = steps.reduce((sum, step) => sum + step.skippedCount, 0);
  const head = errors.join(" · ") || "Fill failed.";
  if (filled > 0 || skipped > 0) return `${head} Filled ${filled}, skipped ${skipped}.`;
  return head;
}

/**
 * Run Deal → Docs → VIN (or Home's steps) with a hard client deadline per step.
 * A returned step error still continues (Docs partial, then VIN).
 * A step that never resolves stops the chain so we don't overlap the in-flight action,
 * and the steps that already finished stay in the result.
 */
export async function runMasterFillSteps(input: {
  steps: { id: MasterFillStepId; label: string }[];
  runStep: (step: { id: MasterFillStepId; label: string }) => Promise<unknown>;
  onStep?: (step: { id: MasterFillStepId; label: string }) => void;
  timeoutMsFor?: (step: MasterFillStepId) => number;
}): Promise<MasterFillStepResult[]> {
  const results: MasterFillStepResult[] = [];
  const timeoutMsFor = input.timeoutMsFor ?? masterFillClientTimeoutMs;
  for (const step of input.steps) {
    input.onStep?.(step);
    try {
      const raw = await withDeadline(Promise.resolve(input.runStep(step)), timeoutMsFor(step.id), () => {
        throw new Error(masterFillStepTimeoutMessage(step.id, step.label));
      });
      if (!isMasterFillStepResult(raw)) {
        results.push({
          step: step.id,
          filledCount: 0,
          skippedCount: 0,
          error: masterFillUnexpectedMessage(step.label),
        });
        continue;
      }
      results.push(raw);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : masterFillUnexpectedMessage(step.label);
      const timedOut = /timed out/i.test(message);
      results.push({
        step: step.id,
        filledCount: 0,
        skippedCount: 0,
        error: timedOut || message.startsWith(`${step.label} failed`) ? message : `${step.label} failed. ${message}`,
      });
      if (timedOut) break;
    }
  }
  return results;
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
