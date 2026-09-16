import Link from "next/link";
import { HistoryBackButton } from "@/components/desk/history-back-button";
import { cn } from "@/lib/utils";

export type DeskTrailCrumb = {
  href?: string;
  label: string;
};

const crumbBase =
  "inline-flex max-w-[14rem] items-center truncate rounded-md border px-2.5 py-1 text-xs font-semibold";

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
                  <span className="px-0.5 text-xs font-semibold text-navy/50" aria-hidden>
                    ›
                  </span>
                ) : null}
                {isLast || !crumb.href ? (
                  <span
                    className={cn(crumbBase, "border-navy bg-navy text-white")}
                    data-ff-desk-crumb="current"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className={cn(
                      crumbBase,
                      "border-navy/35 bg-white text-navy hover:bg-navy/5",
                    )}
                    data-ff-desk-crumb="link"
                  >
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
