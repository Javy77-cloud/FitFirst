import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function SettingsEntityCard({
  title,
  meta,
  href,
  hrefLabel = "Edit",
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  href?: string;
  hrefLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("ff-list-card", className)}>
      <div className="ff-list-card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-navy">{title}</h2>
            {meta ? <p className="mt-0.5 text-helper text-muted-foreground">{meta}</p> : null}
          </div>
          {href ? (
            <Link href={href} className="shrink-0 text-xs font-medium text-primary hover:underline">
              {hrefLabel}
            </Link>
          ) : null}
        </div>
        {children ? <div className="space-y-1 text-sm text-navy">{children}</div> : null}
      </div>
    </article>
  );
}
