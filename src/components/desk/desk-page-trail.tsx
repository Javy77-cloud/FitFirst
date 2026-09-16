import Link from "next/link";
import { HistoryBackButton } from "@/components/desk/history-back-button";
import { cn } from "@/lib/utils";

export type DeskTrailCrumb = {
  href?: string;
  label: string;
};

const crumbLink =
  "inline-flex max-w-[16rem] items-center truncate text-xs font-medium text-navy underline decoration-navy/30 underline-offset-2 hover:decoration-navy";
const crumbCurrent =
  "inline-flex max-w-[16rem] items-center truncate text-xs font-medium text-muted-foreground";

/** Optional history Back + breadcrumb crumbs. Last crumb is the current page (not a link). */
export function DeskPageTrail({
  crumbs = [],
  showBack = true,
  backLabel = "Back",
  fallbackHref,
  backVariant = "outline",
  className,
}: {
  crumbs?: DeskTrailCrumb[];
  showBack?: boolean;
  backLabel?: string;
  fallbackHref?: string;
  backVariant?: "link" | "outline";
  className?: string;
}) {
  if (!showBack && crumbs.length === 0) return null;

  return (
    <div
      className={cn("mb-3 flex flex-wrap items-center gap-x-2 gap-y-1", className)}
      data-ff-desk-trail=""
    >
      {showBack ? (
        <HistoryBackButton
          label={backLabel}
          fallbackHref={fallbackHref}
          variant={backVariant}
        />
      ) : null}
      {crumbs.length > 0 ? (
        <nav
          className="flex flex-wrap items-center gap-1"
          aria-label="Breadcrumb"
          data-ff-desk-crumbs=""
        >
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 ? (
                  <span className="px-0.5 text-xs text-muted-foreground" aria-hidden>
                    /
                  </span>
                ) : null}
                {isLast || !crumb.href ? (
                  <span className={crumbCurrent} data-ff-desk-crumb="current">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className={crumbLink} data-ff-desk-crumb="link">
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
