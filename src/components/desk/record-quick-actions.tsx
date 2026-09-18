"use client";

import {
  contactActionButtonClass,
  contactActionButtonStyle,
  isContactActionKind,
} from "@/lib/desk/contact-actions";
import { DEAL_MEETING_ACTION_COLOR, DEAL_TASK_ACTION_COLOR } from "@/lib/deals/pipeline-desk";
import {
  RECORD_ACTIVITY_ACTIONS,
  RECORD_ACTIVITY_ACTION_WIDTH_CLASS,
  launchQuickCommsAction,
} from "@/lib/desk/quick-comms-open";
import { cn } from "@/lib/utils";

export type RecordQuickActionsProps = {
  phone?: string | null;
  email?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  testId?: string;
  className?: string;
};

/** Desk-wide Call / SMS / Email / Task / Meeting chrome. Same width strip as row actions. */
export function RecordQuickActions({
  dealId,
  leadId,
  contactId,
  accountId,
  policyId,
  testId = "record-quick-actions",
  className,
}: RecordQuickActionsProps) {
  return (
    <div
      className={cn("mt-1 flex flex-nowrap items-center gap-1", className)}
      data-testid={testId}
      data-ff-record-quick-actions=""
      data-ff-record-activity-strip=""
    >
      {RECORD_ACTIVITY_ACTIONS.map((action) => (
        <button
          key={action.kind}
          type="button"
          onClick={() =>
            launchQuickCommsAction({
              kind: action.kind,
              dealId,
              leadId,
              contactId,
              accountId,
              policyId,
            })
          }
          className={cn(
            "inline-flex h-6 shrink-0 items-center justify-center rounded px-0 text-[11px] font-semibold text-white",
            RECORD_ACTIVITY_ACTION_WIDTH_CLASS,
            isContactActionKind(action.kind) ? contactActionButtonClass(action.kind) : null,
          )}
          style={
            action.kind === "task"
              ? { backgroundColor: DEAL_TASK_ACTION_COLOR, color: "#ffffff" }
              : action.kind === "meeting"
                ? { backgroundColor: DEAL_MEETING_ACTION_COLOR, color: "#ffffff" }
                : isContactActionKind(action.kind)
                  ? contactActionButtonStyle(action.kind)
                  : undefined
          }
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
