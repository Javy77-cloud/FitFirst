"use client";

import { useState } from "react";
import { HealthStrip } from "@/components/completeness/health-strip";
import type { CompletenessReport } from "@/lib/completeness/report";

export function SheetHealthToggle({
  report,
  href,
  dealId,
}: {
  report: CompletenessReport;
  href?: string;
  dealId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2" data-ff-sheet-health-toggle>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="text-xs font-medium text-primary hover:underline"
        aria-expanded={open}
      >
        Sheet health
        <span className="ml-1 text-muted-foreground">
          {report.confirmed}/{report.check}/{report.missing}
        </span>
      </button>
      {open ? (
        <div className="w-full min-w-[16rem] sm:w-[28rem]">
          <HealthStrip report={report} title="Sheet health" href={href} dealId={dealId} />
        </div>
      ) : null}
    </div>
  );
}
