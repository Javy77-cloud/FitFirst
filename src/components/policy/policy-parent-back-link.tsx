import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Breadcrumb/back to parent policy from board or sub-pages. */
export function PolicyParentBackLink({
  policyId,
  label = "Back to policy",
  className,
}: {
  policyId?: string | null;
  label?: string;
  className?: string;
}) {
  if (!policyId) return null;
  return (
    <Link
      href={`/policies/${policyId}`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
      data-ff-policy-parent-back={policyId}
    >
      {label}
    </Link>
  );
}
