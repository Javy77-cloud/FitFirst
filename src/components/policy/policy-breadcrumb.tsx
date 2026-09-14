import Link from "next/link";

/** Back to Policies list. Current policy name lives in the page header — do not duplicate it here. */
export function PolicyBreadcrumb({
  backHref = "/policies",
  backLabel = "Policies",
}: {
  /** @deprecated Kept so call sites compile; name is not shown in the crumb. */
  policyLabel?: string | null;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <nav
      className="mb-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
      aria-label="Breadcrumb"
      data-ff-policy-breadcrumb=""
    >
      <Link href={backHref} className="font-medium text-[#002868] hover:underline">
        {backLabel}
      </Link>
    </nav>
  );
}
