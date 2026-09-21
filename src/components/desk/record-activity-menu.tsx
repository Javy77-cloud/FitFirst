"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  type QuickCommsTarget,
} from "@/lib/desk/quick-comms-open";
import { cn } from "@/lib/utils";

const menuBtn =
  "inline-flex h-7 shrink-0 items-center justify-center rounded px-0 text-[11px] font-semibold text-white";

export function RecordActivityMenu({
  menuTestId,
  listTestId,
  optionAttr = "data-ff-record-activity-option",
  dealId,
  leadId,
  contactId,
  accountId,
  policyId,
  onKind,
}: {
  menuTestId: string;
  listTestId: string;
  optionAttr?: string;
  dealId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  /** When the desk already has a board, select that record instead of navigating away. */
  onKind?: (kind: QuickCommsTarget["kind"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const targetBase = { dealId, leadId, contactId, accountId, policyId };

  function run(kind: QuickCommsTarget["kind"]) {
    setOpen(false);
    if (onKind) {
      onKind(kind);
      return;
    }
    launchQuickCommsAction({ ...targetBase, kind });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        type="button"
        aria-label="Activity"
        title="Activity"
        data-testid={menuTestId}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        <Activity className="size-3.5" strokeWidth={2.25} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-max min-w-0 p-1.5" sideOffset={4}>
        <div
          className="flex flex-col items-center gap-1"
          data-testid={listTestId}
          data-ff-record-activity-strip=""
        >
          {RECORD_ACTIVITY_ACTIONS.map((action) => (
            <button
              key={action.kind}
              type="button"
              {...{ [optionAttr]: action.kind }}
              onClick={() => run(action.kind)}
              className={cn(
                menuBtn,
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
