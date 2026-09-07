/** In-house quoting stops at paid rater / IVANS walls. Stubs only — no live plugs. */

export const PAID_QUOTE_WALLS = [
  {
    id: "ivans",
    label: "IVANS",
    detail: "Download / rater feed is a paid plug. FitFirst does not call IVANS from this desk.",
  },
  {
    id: "ezlynx",
    label: "EZLynx",
    detail: "Comparative rater stays agency-paid. No FitFirst EZLynx login.",
  },
  {
    id: "quoterush",
    label: "QuoteRush",
    detail: "Paid rater wall. Stub quotes here are in-house only.",
  },
] as const;

export const PAID_WALL_HEADLINE =
  "Stops at the paid API wall. In-appetite request writes stub quotes in this desk — no IVANS, EZLynx, or QuoteRush call.";
