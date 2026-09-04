/** Five insurance campaign sequences. Task + email template stubs — nothing sends. */

export const SEQUENCE_SLUGS = [
  "lead_nurture",
  "quote_follow_up",
  "renewal_60_30",
  "cross_sell",
  "review_ask",
] as const;
export type SequenceSlug = (typeof SEQUENCE_SLUGS)[number];

export const SEQUENCE_STEP_KINDS = ["task", "email_template"] as const;
export type SequenceStepKind = (typeof SEQUENCE_STEP_KINDS)[number];

export type SequenceStep = {
  key: string;
  kind: SequenceStepKind;
  offsetDays: number;
  title: string;
  taskTitle?: string;
  taskKind?: string;
  emailSubject?: string;
  emailBody?: string;
  templateSlug?: string;
};

export type SequenceDefinition = {
  slug: SequenceSlug;
  name: string;
  summary: string;
  audience: string;
  anchor: string;
  steps: SequenceStep[];
};

export function isSequenceSlug(value: string): value is SequenceSlug {
  return (SEQUENCE_SLUGS as readonly string[]).includes(value);
}

export function isSequenceStepKind(value: string): value is SequenceStepKind {
  return (SEQUENCE_STEP_KINDS as readonly string[]).includes(value);
}

export function offsetLabel(offsetDays: number, anchor: string): string {
  if (offsetDays === 0) return `Same day as ${anchor}`;
  const days = Math.abs(offsetDays);
  const unit = days === 1 ? "day" : "days";
  if (offsetDays < 0) return `${days} ${unit} before ${anchor}`;
  return `${days} ${unit} after ${anchor}`;
}

export function stepKindLabel(kind: SequenceStepKind): string {
  return kind === "task" ? "Task" : "Email template";
}
