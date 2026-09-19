"use client";

import { useState, useTransition } from "react";
import { skipExperienceReview, submitExperienceReview } from "@/app/actions/health-reviews";
import { REVIEW_MOMENT_LABEL, type PendingReviewPrompt } from "@/lib/health/reviews";

export function ExperienceReviewPrompt({ prompt }: { prompt: PendingReviewPrompt }) {
  const [open, setOpen] = useState(true);
  const [stars, setStars] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) return null;

  function submit(kind: "rate" | "skip") {
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
      <p className="ff-review-prompt-kicker">Quick review · {REVIEW_MOMENT_LABEL[prompt.moment]}</p>
      <p className="ff-review-prompt-title">{prompt.promptText}</p>
      <p className="ff-review-prompt-entity">{prompt.entityLabel}</p>
      <div className="ff-review-stars" role="group" aria-label="1 to 5 stars">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={value <= stars ? "is-on" : undefined}
            data-ff-review-star={value}
            aria-pressed={value <= stars}
            onClick={() => setStars(value)}
          >
            ★
            <span className="sr-only">{value} star{value === 1 ? "" : "s"}</span>
          </button>
        ))}
      </div>
      {error ? (
        <p className="ff-review-prompt-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="ff-review-prompt-actions">
        <button type="button" className="ff-review-prompt-save" disabled={pending} onClick={() => submit("rate")}>
          Save rating
        </button>
        <button type="button" className="ff-review-prompt-skip" disabled={pending} onClick={() => submit("skip")}>
          Skip{prompt.skipCount === 1 ? " (last time)" : ""}
        </button>
      </div>
    </div>
  );
}
