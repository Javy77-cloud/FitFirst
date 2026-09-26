import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Desk compare destination: `/policies/:id/compare`.
 * Persistent placement sits in the Links & renewal heading so the Renewal
 * agreed stamp does not cover it.
 */
export function CompareTermsLink({
  policyId,
  persistent = false,
}: {
  policyId: string;
  persistent?: boolean;
}) {
  const label = persistent
    ? "Compare terms — opens prior term vs current term, does not bind"
    : "Compare terms — opens current vs upcoming comparison, does not bind";
  return (
    <Link
      href={`/policies/${policyId}/compare`}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "ff-compare-terms-btn",
        persistent && "ff-compare-terms-persistent",
      )}
      title={persistent ? "Opens prior vs current terms — does not bind" : "Opens current vs upcoming comparison — does not bind"}
      aria-label={label}
      data-ff-compare-terms=""
      {...(persistent ? { "data-ff-compare-terms-persistent": "" } : {})}
    >
      Compare terms
    </Link>
  );
}
