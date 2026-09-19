"use client";

import { useState, useTransition } from "react";
import { skipExperienceReview, submitExperienceReview } from "@/app/actions/health-reviews";
import { REVIEW_MOMENT_LABEL, type PendingReviewPrompt } from "@/lib/health/reviews";
import { reviewPulseHeadline, reviewPulseHint, triggerFromReviewMoment } from "@/lib/renewal/review-pulse";
import { cn } from "@/lib/utils";

export function ExperienceReviewPrompt({ prompt }: { prompt: PendingReviewPrompt }) {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const trigger = triggerFromReviewMoment(prompt.moment);

  if (!open) return null;

  function write(kind: "rate" | "skip", stars = 0) {
    const form = new FormData();
    form.set("moment", prompt.moment);
    form.set("promptId", prompt.promptId);
    form.set("contactId", prompt.contactId ?? "");
    form.set("policyId", prompt.policyId ?? "");
    form.set("dealId", prompt.dealId ?? "");
    form.set("activityId", prompt.activityId ?? "");
    if (kind === "rate") form.set("stars", String(stars));
    start(async () => {
      const result = kind === "skip" ? await skipExperienceReview(form) : await submitExperienceReview(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <div className="ff-review-prompt" data-ff-review-prompt={prompt.moment} role="dialog" aria-label="Experience review">
      <p className="ff-review-prompt-kicker">10-second pulse · {REVIEW_MOMENT_LABEL[prompt.moment]}</p>
      <p className="ff-review-prompt-title">{reviewPulseHeadline(trigger, prompt.entityLabel)}</p>
      <p className="ff-review-prompt-entity">{prompt.promptText}</p>
      <div className="ff-review-pips" role="group" aria-label="1 to 5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={cn("ff-review-pip", value === picked && "is-on")}
            data-ff-review-star={value}
            disabled={pending}
            onClick={() => {
              setPicked(value);
              write("rate", value);
            }}
          >
            {value}
            <span className="sr-only">{value} of 5</span>
          </button>
        ))}
      </div>
      <p className="ff-review-pulse-scale">
        <span>Weak</span>
        <span>Strong</span>
      </p>
      {error ? (
        <p className="ff-review-prompt-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="ff-review-prompt-hint">{reviewPulseHint(trigger)}</p>
      <button type="button" className="ff-review-prompt-skip" disabled={pending} onClick={() => write("skip")}>
        Skip{prompt.skipCount === 1 ? " (last time)" : " once"}
      </button>
    </div>
  );
}
