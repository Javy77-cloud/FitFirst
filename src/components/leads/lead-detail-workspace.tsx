"use client";

import type { ReactNode } from "react";
import { updateLeadRecord } from "@/app/actions/record-edit";
import { Button } from "@/components/ui/button";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";

/**
 * Lead detail: page-level fields | 420px Quick Comms + Info rail (same stack as contacts/deals).
 * Activity / Related sit in the main column under Save — never inside a clipping RecordSection card.
 * Save Lead sits under the fields only — never under the rail.
 */
export function LeadDetailWorkspace({
  leadId,
  state,
  rail,
  afterFields,
  children,
}: {
  leadId: string;
  dealId?: string | null;
  insuranceTypeDesired?: string | null;
  state: string;
  docs?: unknown;
  rail?: ReactNode;
  afterFields?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="grid w-full items-start gap-x-5"
      style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}
      data-ff-lead-layout="layout-rail"
      data-ff-lead-detail-workspace=""
    >
      <div className="min-w-0 w-full space-y-4" data-ff-lead-main="">
        <div className="min-w-0 w-full" data-ff-lead-edit-layout="">
          <div className="mb-2 flex items-center justify-end" data-ff-lead-edit-layout-bar="">
            <EditLayoutLink module="leads" />
          </div>
          <form action={updateLeadRecord} className="w-full space-y-3">
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="state" value={state} />
            {children}
            <div className="flex items-center justify-end gap-3 pt-1" data-ff-lead-actions="">
              <Button type="submit" data-ff-save-lead="">
                Save Lead
              </Button>
            </div>
          </form>
        </div>
        {afterFields}
      </div>
      {rail ? (
        <aside
          className="min-w-0 w-full space-y-3 overflow-x-hidden"
          data-ff-lead-context-rail=""
          data-ff-deal-right-rail=""
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
