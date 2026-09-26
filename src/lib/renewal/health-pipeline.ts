/**
 * Health renewal pipeline. Agent status + notes are the source of truth.
 * FitFirst does not quote or bind health. No webhook auto-advance.
 * Completing a task is logged elsewhere and must not move this status.
 */

export const HEALTH_PIPELINE_STATUSES = [
  "identified",
  "contacted",
  "quotes_pulled",
  "proposal_shared",
  "decision_pending",
  "submitted",
  "bound",
  "dropped",
] as const;
export type HealthPipelineStatus = (typeof HEALTH_PIPELINE_STATUSES)[number];

export const HEALTH_PIPELINE_STATUS_LABELS: Record<HealthPipelineStatus, string> = {
  identified: "Identified for renewal",
  contacted: "Contacted / OE notice sent",
  quotes_pulled: "Quotes pulled (external)",
  proposal_shared: "Proposal shared with client",
  decision_pending: "Decision pending",
  submitted: "Submitted to carrier",
  bound: "Bound",
  dropped: "Dropped / client staying with current",
};

export const HEALTH_NOTE_LANGS = ["en", "es"] as const;
export type HealthNoteLang = (typeof HEALTH_NOTE_LANGS)[number];

export const HEALTH_NOTE_CHANNELS = ["text", "voice"] as const;
export type HealthNoteChannel = (typeof HEALTH_NOTE_CHANNELS)[number];

export type HealthPipelineNote = {
  id: string;
  status: HealthPipelineStatus;
  body: string;
  lang: HealthNoteLang;
  channel: HealthNoteChannel;
  actorId: string | null;
  at: string;
};

export function isHealthPipelineStatus(value: string | null | undefined): value is HealthPipelineStatus {
  return (HEALTH_PIPELINE_STATUSES as readonly string[]).includes(value ?? "");
}

export function healthPipelineStatusLabel(value: string | null | undefined): string {
  return isHealthPipelineStatus(value) ? HEALTH_PIPELINE_STATUS_LABELS[value] : "Not set";
}

export function normalizeHealthNoteLang(value: string | null | undefined): HealthNoteLang {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "es" || raw.startsWith("es")) return "es";
  return "en";
}

export function normalizeHealthNoteChannel(value: string | null | undefined): HealthNoteChannel {
  return value === "voice" ? "voice" : "text";
}

export function appendHealthPipelineNote(
  notes: readonly HealthPipelineNote[] | null | undefined,
  note: HealthPipelineNote,
): HealthPipelineNote[] {
  const body = note.body.trim();
  const next = body ? { ...note, body } : null;
  const prior = Array.isArray(notes) ? notes : [];
  return next ? [...prior, next] : prior;
}

/**
 * Task completion never moves the health pipeline.
 * The returned status is the status the agent last set.
 */
export function healthPipelineStatusAfterTaskComplete(
  status: string | null | undefined,
): HealthPipelineStatus | null {
  return isHealthPipelineStatus(status) ? status : null;
}
