import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SCORECARD_SORTS, SCORECARD_SORT_LABEL, type ScorecardSort } from "@/lib/scorecards/types";
import { cn } from "@/lib/utils";

export function ScorecardSortTabs({
  sort,
  basePath = "/scorecards",
}: {
  sort: ScorecardSort;
  basePath?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {SCORECARD_SORTS.map((value) => (
        <Link
          key={value}
          href={`${basePath}?sort=${value}`}
          className={cn(buttonVariants({ size: "sm", variant: sort === value ? "default" : "outline" }))}
        >
          {SCORECARD_SORT_LABEL[value]}
        </Link>
      ))}
    </div>
  );
}
