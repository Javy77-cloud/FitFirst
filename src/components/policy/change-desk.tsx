import { CancellationForm, EndorsementForm, NonRenewalForm } from "@/components/policy/change-forms";
import { DeskDetails } from "@/components/desk-details";
import { isInForceStatus } from "@/lib/policy/status";
import { filedChangeOutcome } from "@/lib/policy/outcomes";
import { cn } from "@/lib/utils";

export function PolicyOutcomeBanner({
  filed,
  error,
  policy,
}: {
  filed?: string | null;
  error?: string | null;
  policy: {
    status: string;
    endReason?: string | null;
    endedAt?: Date | null;
    coverageA?: number | null;
  };
}) {
  if (error) {
    return (
      <section className="mb-4 rounded-md border border-fit-red bg-fit-red-bg px-4 py-3 text-sm text-fit-red">
        {error}
      </section>
    );
  }

  // Status lives on the header status dot — no always-on "Active — in force" banner.
  if (filed !== "endorsement" && filed !== "cancellation" && filed !== "non_renewal") {
    return null;
  }

  const outcome = filedChangeOutcome(filed, policy);

  return (
    <section
      className={cn(
        "mb-4 rounded-md border px-4 py-3",
        outcome.tone === "ended"
          ? "border-fit-red/40 bg-fit-red-bg"
          : outcome.tone === "in_force"
            ? "border-fit-green/40 bg-fit-green-bg"
            : "border-border bg-card",
      )}
      data-ff-policy-outcome={outcome.kind}
    >
      <h2 className="text-sm font-semibold text-navy">{outcome.title}</h2>
      <p className="mt-1 text-base text-muted-foreground">{outcome.body}</p>
    </section>
  );
}

export function PolicyChangeDesk({
  policyId,
  coverageA,
  premium,
  status,
}: {
  policyId: string;
  coverageA: number | null;
  premium: string | null;
  status: string;
}) {
  const inForce = isInForceStatus(status);
  if (!inForce) {
    return (
      <section className="ff-card p-4 text-base text-muted-foreground">
        This Policy is off the book. Endorsement, cancel, and non-renew are closed. Shop a
        replacement on a new Deal — do not reuse this policy number.
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <DeskDetails
        title="File endorsement"
        summary="Change in force on this Policy. Same record — not a new Policy."
        open={false}
      >
        <EndorsementForm policyId={policyId} coverageA={coverageA} premium={premium} />
      </DeskDetails>
      <DeskDetails
        title="File cancellation"
        summary="Ends this Policy. Reason and date stay here."
        open={false}
      >
        <CancellationForm policyId={policyId} />
      </DeskDetails>
      <DeskDetails
        title="File non-renewal"
        summary="Same end as cancel, with a non-renewal reason."
        open={false}
      >
        <NonRenewalForm policyId={policyId} />
      </DeskDetails>
    </div>
  );
}
