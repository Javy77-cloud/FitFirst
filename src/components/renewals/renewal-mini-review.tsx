"use client";

import { useState } from "react";
import { skipRenewalMiniReview, submitRenewalMiniReview } from "@/app/actions/renewals-wedge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { canSkipMiniReview, rotateMiniReviewQuestions } from "@/lib/renewal/mini-review";
import { reviewPulseHeadline, reviewPulseHint } from "@/lib/renewal/review-pulse";
import type { MiniReviewTrigger } from "@/lib/renewal/mini-review";
import { cn } from "@/lib/utils";

function HiddenIds({
  policyId,
  contactId,
  accountId,
  trigger,
}: {
  policyId: string;
  contactId: string | null;
  accountId: string | null;
  trigger: string;
}) {
  return (
    <>
      <input type="hidden" name="policyId" value={policyId} />
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
      <input type="hidden" name="trigger" value={trigger} />
    </>
  );
}

export function RenewalMiniReview({
  policyId,
  contactId,
  accountId,
  skipCount,
  seed,
  trigger = "desk",
  clientName = "this client",
  openOnMount = false,
}: {
  policyId: string;
  contactId: string | null;
  accountId: string | null;
  skipCount: number;
  seed: string;
  trigger?: MiniReviewTrigger | "desk";
  clientName?: string;
  openOnMount?: boolean;
}) {
  const questions = rotateMiniReviewQuestions(seed, 4);
  const canSkip = canSkipMiniReview(skipCount);
  const [open, setOpen] = useState(openOnMount);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const question = questions[step];
  const last = step >= questions.length - 1;
  const headline = reviewPulseHeadline(trigger === "desk" ? "chase" : trigger, clientName);

  function pick(score: number) {
    if (!question) return;
    setScores((prev) => ({ ...prev, [question.id]: score }));
    if (!last) setStep((prev) => prev + 1);
  }

  return (
    <div className="ff-renewal-review" data-ff-mini-review="">
      {!openOnMount ? (
        <button
          type="button"
          className="ff-review-chip"
          onClick={() => setOpen(true)}
          data-ff-review-open=""
        >
          How’d it go?
        </button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="ff-review-pulse-dialog sm:max-w-md" data-ff-review-pulse="" showCloseButton>
          <DialogHeader>
            <DialogTitle>{headline}</DialogTitle>
            <DialogDescription>{reviewPulseHint(trigger === "desk" ? "chase" : trigger)}</DialogDescription>
          </DialogHeader>
          {question ? (
            <form action={submitRenewalMiniReview} className="ff-review-pulse-form">
              <HiddenIds policyId={policyId} contactId={contactId} accountId={accountId} trigger={trigger} />
              {questions.map((row) =>
                scores[row.id] ? (
                  <input key={row.id} type="hidden" name={`score_${row.id}`} value={scores[row.id]} />
                ) : null,
              )}
              <p className="ff-review-pulse-step">
                {step + 1} of {questions.length}
              </p>
              <p className="ff-review-pulse-prompt">{question.prompt}</p>
              <div className="ff-review-pips" role="group" aria-label="Score 1 to 5">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type={last ? "submit" : "button"}
                    className={cn("ff-review-pip", scores[question.id] === score && "is-on")}
                    onClick={last ? undefined : () => pick(score)}
                    name={last ? `score_${question.id}` : undefined}
                    value={last ? score : undefined}
                    data-ff-review-score={score}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <p className="ff-review-pulse-scale">
                <span>Weak</span>
                <span>Strong</span>
              </p>
            </form>
          ) : null}
          {canSkip ? (
            <form action={skipRenewalMiniReview} className="ff-renewal-review-skip">
              <HiddenIds policyId={policyId} contactId={contactId} accountId={accountId} trigger={trigger} />
              <input type="hidden" name="skipCount" value={String(skipCount)} />
              <Button type="submit" size="xs" variant="ghost">
                Skip once
              </Button>
            </form>
          ) : (
            <span className="ff-renewal-review-locked">Skip used — finish this one.</span>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
