export type FillPathStepId = "drop" | "line" | "fill" | "glance" | "send";

export type FillPathStep = {
  n: number;
  id: FillPathStepId;
  label: string;
  hint: string;
};

/** Risk Profile → Fill. Zero rekey: Fill reads the approved profile, never the PDF. */
export const MASTER_TO_FILL_STEPS: FillPathStep[] = [
  {
    n: 1,
    id: "drop",
    label: "Drop source docs",
    hint: "Dec, wind mit, and 4-point stay on this Deal. They never become the paste source.",
  },
  {
    n: 2,
    id: "line",
    label: "Choose quoting line",
    hint: "HO3 fills the homeowners Risk Profile and prepares Auto + GL + WC worksheets.",
  },
  {
    n: 3,
    id: "fill",
    label: "Fill Risk Profile",
    hint: "Parses those source docs into the Risk Profile. Blanks only. Yellow missing / blue CHECK.",
  },
  {
    n: 4,
    id: "glance",
    label: "Glance yellow / CHECK",
    hint: "Source vs Risk Profile. Approve after you look. Do not paste from the PDF.",
  },
  {
    n: 5,
    id: "send",
    label: "Approve, then Send to Fill",
    hint: "Fill reads the approved Risk Profile — zero rekey. Chrome Fill / Copy Risk Profile share that row.",
  },
];

export const FILL_HANDOFF_TITLE = "Send the approved Risk Profile to Fill";
export const FILL_HANDOFF_HINT =
  "Zero rekey. Copy Risk Profile, Send to Fill, and Open Fill window all read this Risk Profile — never the raw PDFs. Prefer the Chrome Fill add-on.";
export const COPY_SHEET_LABEL = "Copy Risk Profile";
export const SEND_TO_FILL_LABEL = "Send Risk Profile to Fill";
export const OPEN_FILL_LABEL = "Open Fill window";

export function fillPathStepIndex(input: {
  sourceDocCount: number;
  hasQuotingForm: boolean;
  fillFinished: boolean;
  unlocked: boolean;
}): number {
  if (input.sourceDocCount === 0) return 1;
  if (!input.hasQuotingForm) return 2;
  if (!input.fillFinished) return 3;
  if (!input.unlocked) return 4;
  return 5;
}
