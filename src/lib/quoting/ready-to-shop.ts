import type { CompletenessReport } from "@/lib/completeness/report";
import { fillPathStepIndex } from "./fill-path";

export type ShopCueKind =
  | "ana_lock"
  | "need_docs"
  | "need_line"
  | "need_fill"
  | "need_glance"
  | "need_approve"
  | "thin_sheet"
  | "ready";

export type ShopCue = {
  kind: ShopCueKind;
  title: string;
  body: string;
  tone: "lock" | "warn" | "go";
  fillStep: number;
};

export function readyToShopCue(input: {
  isAna: boolean;
  sourceDocCount: number;
  hasQuotingForm: boolean;
  fillFinished: boolean;
  unlocked: boolean;
  health: CompletenessReport | null;
}): ShopCue {
  const fillStep = fillPathStepIndex({
    sourceDocCount: input.sourceDocCount,
    hasQuotingForm: input.hasQuotingForm,
    fillFinished: input.fillFinished,
    unlocked: input.unlocked,
  });
  const thin =
    Boolean(input.health) &&
    (!input.health!.shopReady || input.health!.check > 0 || input.health!.missing > 0);

  if (input.isAna) {
    return {
      kind: "ana_lock",
      title: "Ana stays shopping · Cov A $321,000",
      body: input.unlocked
        ? "Sheet approved for Fill. Markets stay filter-first. Quotes are not policies. Do not bind this shop."
        : "Glance yellow missing / blue CHECK, then approve twice to unlock Send to Fill. Coverage A is Javy-tested $321,000. Do not bind.",
      tone: "lock",
      fillStep,
    };
  }

  if (input.sourceDocCount === 0) {
    return {
      kind: "need_docs",
      title: "Drop a source dec first",
      body: "Upload a dec, wind mit, 4-point, or photo on Documents. Fill reads those files into the Quote Sheet — never the other way around.",
      tone: "warn",
      fillStep,
    };
  }

  if (!input.hasQuotingForm) {
    return {
      kind: "need_line",
      title: "Choose the quoting line",
      body: "Pick HO3 (or the matching line) so Fill master sheet knows which worksheet to write.",
      tone: "warn",
      fillStep,
    };
  }

  if (!input.fillFinished) {
    return {
      kind: "need_fill",
      title: "Fill the master sheet",
      body: "Parse the source docs into yellow missing / blue CHECK cells. Blanks only — typed and Javy-tested values stay.",
      tone: "warn",
      fillStep,
    };
  }

  if (!input.unlocked) {
    return {
      kind: thin ? "need_glance" : "need_approve",
      title: thin ? "Glance yellow / CHECK, then approve twice" : "Approve the master sheet",
      body: thin
        ? `${input.health!.missing} missing · ${input.health!.check} CHECK. Confirm the blue values, then the two-step unlock. Send to Fill stays locked until both clicks.`
        : "Visual review + “are you sure?” unlock Copy sheet / Send to Fill / shop. Quotes still do not bind.",
      tone: "warn",
      fillStep,
    };
  }

  if (thin) {
    return {
      kind: "thin_sheet",
      title: "Ready to shop appointed markets — sheet still thin",
      body: `${input.health!.confirmed} confirmed · ${input.health!.check} CHECK · ${input.health!.missing} missing. Shop the greens. Quotes are not coverage.`,
      tone: "go",
      fillStep,
    };
  }

  return {
    kind: "ready",
    title: "Ready to shop appointed markets",
    body: "Master sheet is approved. Send to Fill reads this row. Quotes stay quotes until Closed Won bind.",
    tone: "go",
    fillStep,
  };
}
