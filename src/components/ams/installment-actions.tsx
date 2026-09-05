import { advancePolicyInstallment } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";

export function InstallmentActions({
  installmentId,
  status,
  returnTo = "/installments",
}: {
  installmentId: string;
  status: string;
  returnTo?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {status === "scheduled" ? (
        <form action={advancePolicyInstallment}>
          <input type="hidden" name="installmentId" value={installmentId} />
          <input type="hidden" name="action" value="mark_due" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" size="sm">
            Mark due
          </Button>
        </form>
      ) : null}
      {status === "due" ? (
        <form action={advancePolicyInstallment}>
          <input type="hidden" name="installmentId" value={installmentId} />
          <input type="hidden" name="action" value="mark_past_due" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" size="sm" variant="secondary">
            Mark past due
          </Button>
        </form>
      ) : null}
      {status === "scheduled" || status === "due" || status === "past_due" ? (
        <>
          <form action={advancePolicyInstallment}>
            <input type="hidden" name="installmentId" value={installmentId} />
            <input type="hidden" name="action" value="receive" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Button type="submit" size="sm" variant="outline">
              Mark received
            </Button>
          </form>
          <form action={advancePolicyInstallment}>
            <input type="hidden" name="installmentId" value={installmentId} />
            <input type="hidden" name="action" value="waive" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Button type="submit" size="sm" variant="secondary">
              Waive
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}
