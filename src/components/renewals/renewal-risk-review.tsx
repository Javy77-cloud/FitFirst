import { confirmRenewalRiskReview } from "@/app/actions/renewal-shopping";
import { Button } from "@/components/ui/button";

/** P&C renewal shop. Markets stay closed until the agent confirms the risk. */
export function RenewalRiskReview({ dealId }: { dealId: string }) {
  return (
    <section className="ff-card space-y-2 p-4" data-ff-renewal-risk-review="">
      <h2 className="text-sm font-semibold text-navy">Review risk before markets</h2>
      <p className="text-sm text-muted-foreground">
        This shopping deal was copied from the renewal. FitFirst will not auto-market until you confirm the risk profile.
      </p>
      <form action={confirmRenewalRiskReview}>
        <input type="hidden" name="dealId" value={dealId} />
        <Button type="submit" size="sm" data-ff-renewal-risk-confirm="">
          I&apos;ve reviewed the risk
        </Button>
      </form>
    </section>
  );
}
