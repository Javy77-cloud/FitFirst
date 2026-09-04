"use client";

import { usePathname } from "next/navigation";
import { moduleTitleFromPath, recordSubtitle } from "@/lib/desk/module-title";

export function ModuleHeading({ pageTitle }: { pageTitle?: string }) {
  const pathname = usePathname() ?? "/";
  const moduleTitle = moduleTitleFromPath(pathname);
  const subtitle = recordSubtitle(moduleTitle, pageTitle);

  return (
    <div className="min-w-0">
      <h1 className="text-lg font-semibold text-navy">{moduleTitle}</h1>
      {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
