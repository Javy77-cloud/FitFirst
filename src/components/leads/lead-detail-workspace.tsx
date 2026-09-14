"use client";

import type { ReactNode } from "react";
import { updateLeadRecord } from "@/app/actions/record-edit";
import { Button } from "@/components/ui/button";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";

/**
 * Lead detail: full-width field layout (two Edit Layout columns) + 420px Info/Conversations rail.
 * Save Lead sits under the fields only — never under the rail.
 */
export function LeadDetailWorkspace({
  leadId,
  state,
  rail,
  children,
}: {
  leadId: string;
  dealId?: string | null;
  insuranceTypeDesired?: string | null;
  state: string;
  docs?: unknown;
  rail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="grid w-full items-start gap-x-5"
      style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}
      data-ff-lead-layout="layout-rail"
    >
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
