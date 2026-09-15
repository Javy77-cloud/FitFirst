import Link from "next/link";

export type PipelineBookMode = "new" | "renewals";

/** Top toggle: New (shopping deals) | Renewals — large segmented control. */
export function PipelineBookModeToggle({
  mode,
  newHref = "/deals?view=list",
  renewalsHref = "/renewals",
}: {
  mode: PipelineBookMode;
  newHref?: string;
  renewalsHref?: string;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-navy/20 bg-card p-1 shadow-sm"
      data-ff-pipeline-book-toggle=""
      role="tablist"
      aria-label="Pipeline book"
    >
      <Link
        href={newHref}
        role="tab"
        aria-selected={mode === "new"}
        data-active={mode === "new" ? "true" : "false"}
        className={
          mode === "new"
            ? "rounded-lg bg-navy px-6 py-2 text-base font-semibold text-white shadow-sm"
            : "rounded-lg px-6 py-2 text-base font-semibold text-muted-foreground hover:bg-muted/70 hover:text-navy"
        }
      >
        New
      </Link>
      <Link
        href={renewalsHref}
        role="tab"
        aria-selected={mode === "renewals"}
        data-active={mode === "renewals" ? "true" : "false"}
        className={
          mode === "renewals"
            ? "rounded-lg bg-navy px-6 py-2 text-base font-semibold text-white shadow-sm"
            : "rounded-lg px-6 py-2 text-base font-semibold text-muted-foreground hover:bg-muted/70 hover:text-navy"
        }
      >
        Renewals
      </Link>
    </div>
  );
}
