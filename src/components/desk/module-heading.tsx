"use client";

import { usePathname } from "next/navigation";
import { moduleTitleFromPath, recordSubtitle } from "@/lib/desk/module-title";

export function ModuleHeading({ pageTitle }: { pageTitle?: string }) {
  const pathname = usePathname() ?? "/";
  const moduleTitle = moduleTitleFromPath(pathname);
  const subtitle = recordSubtitle(moduleTitle, pageTitle);

  return (
    <div className="min-w-0 shrink-0 pr-3">
      <h1 className="whitespace-nowrap text-lg font-semibold text-navy">{moduleTitle}</h1>
      {subtitle ? <p className="max-w-[16rem] truncate text-sm text-muted-foreground sm:max-w-xs">{subtitle}</p> : null}
    </div>
  );
}
