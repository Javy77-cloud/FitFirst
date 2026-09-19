"use client";

import { skipRenewalMiniReview, submitRenewalMiniReview } from "@/app/actions/renewals-wedge";
import { Button } from "@/components/ui/button";
import { canSkipMiniReview, rotateMiniReviewQuestions } from "@/lib/renewal/mini-review";

function HiddenIds({
  policyId,
  contactId,
  accountId,
}: {
  policyId: string;
  contactId: string | null;
  accountId: string | null;
}) {
  return (
    <>
      <input type="hidden" name="policyId" value={policyId} />
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
    </>
  );
}

export function RenewalMiniReview({
  policyId,
  contactId,
  accountId,
  skipCount,
  seed,
}: {
  policyId: string;
  contactId: string | null;
  accountId: string | null;
  skipCount: number;
  seed: string;
}) {
  const questions = rotateMiniReviewQuestions(seed, 4);
  const canSkip = canSkipMiniReview(skipCount);

  return (
    <div className="ff-renewal-review" data-ff-mini-review="">
      <form action={submitRenewalMiniReview}>
        <HiddenIds policyId={policyId} contactId={contactId} accountId={accountId} />
        <input type="hidden" name="trigger" value="desk" />
        <p>Mini-review — 1 weak, 5 strong</p>
        <ol>
          {questions.map((question) => (
            <li key={question.id}>
              <label htmlFor={`${policyId}-${question.id}`}>{question.prompt}</label>
              <select id={`${policyId}-${question.id}`} name={`score_${question.id}`} defaultValue="" required>
                <option value="" disabled>
                  —
                </option>
                {[1, 2, 3, 4, 5].map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ol>
        <div className="ff-renewal-review-actions">
          <Button type="submit" size="xs">
            Save review
          </Button>
        </div>
      </form>
      {canSkip ? (
        <form action={skipRenewalMiniReview} className="ff-renewal-review-skip">
          <HiddenIds policyId={policyId} contactId={contactId} accountId={accountId} />
          <input type="hidden" name="skipCount" value={String(skipCount)} />
          <Button type="submit" size="xs" variant="ghost">
            Skip once
          </Button>
        </form>
      ) : (
        <span className="ff-renewal-review-locked">Skip used — finish this one.</span>
      )}
    </div>
  );
}
