import Link from "next/link";
import { HistoryBackButton } from "@/components/desk/history-back-button";
import { cn } from "@/lib/utils";

export type DeskTrailCrumb = {
  href?: string;
  label: string;
};

/** Optional history Back + breadcrumb crumbs. Last crumb is the current page (not a link). */
export function DeskPageTrail({
  crumbs = [],
  showBack = true,
  backLabel = "Back",
  fallbackHref,
  backVariant = "link",
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
      className={cn("mb-3 flex flex-wrap items-center gap-x-3 gap-y-1", className)}
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
          className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
                {index > 0 ? <span aria-hidden>/</span> : null}
                {isLast || !crumb.href ? (
                  <span className="truncate text-navy">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="font-medium text-[#002868] hover:underline"
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
