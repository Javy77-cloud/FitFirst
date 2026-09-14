import Link from "next/link";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";

export type PipelineBookMode = "new" | "renewals";

/** Top toggle: New (shopping deals) | Renewals — same chrome as Old Glory chip tabs. */
export function PipelineBookModeToggle({
  mode,
  newHref = "/deals?view=board",
  renewalsHref = "/renewals",
}: {
  mode: PipelineBookMode;
  newHref?: string;
  renewalsHref?: string;
}) {
  return (
    <div className={FF_CHIP_TAB_GROUP} data-ff-pipeline-book-toggle="" role="tablist" aria-label="Pipeline book">
      <Link
        href={newHref}
        role="tab"
        aria-selected={mode === "new"}
        data-active={mode === "new" ? "true" : "false"}
        className={chipTabClass(mode === "new")}
      >
        New
      </Link>
      <Link
        href={renewalsHref}
        role="tab"
        aria-selected={mode === "renewals"}
        data-active={mode === "renewals" ? "true" : "false"}
        className={chipTabClass(mode === "renewals")}
      >
        Renewals
      </Link>
    </div>
  );
}
