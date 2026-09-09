"use client";

import { useEffect, useState } from "react";
import {
  archiveClosedDealNow,
  archiveDealFromReminder,
  scheduleDealArchiveReminder,
} from "@/app/actions/pipeline";
import { snoozeDeskAlert } from "@/app/actions/alerts";
import { FollowUpSnoozePresets } from "@/components/leads/follow-up-snooze-presets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CLOSED_DEAL_ARCHIVE_COPY,
  CLOSED_DEAL_ARCHIVE_TITLE,
} from "@/lib/deals/archive-reminder";
import { flashAction } from "@/lib/flash-client";
import type { SnoozeDelayUnit } from "@/lib/leads/follow-up-templates";

export type ClosedDealArchivePopupProps = {
  dealId: string;
  dealTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, this is a fired in-app reminder (sitewide host). */
  alertId?: string | null;
};

export function ClosedDealArchivePopup({
  dealId,
  dealTitle,
  open,
  onOpenChange,
  alertId = null,
}: ClosedDealArchivePopupProps) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) setPending(false);
  }, [open]);

  async function archiveNow() {
    setPending(true);
    try {
      if (alertId) {
        const form = new FormData();
        form.set("alertId", alertId);
        form.set("dealId", dealId);
        await archiveDealFromReminder(form);
      } else {
        await archiveClosedDealNow({ dealId });
      }
      flashAction("deal-archived");
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  async function snooze(amount: number, unit: SnoozeDelayUnit) {
    setPending(true);
    try {
      if (alertId) {
        const form = new FormData();
        form.set("alertId", alertId);
        form.set("amount", String(amount));
        form.set("unit", unit);
        await snoozeDeskAlert(form);
      } else {
        await scheduleDealArchiveReminder({ dealId, amount, unit, dealTitle });
      }
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && alertId) return; // fired reminder: Archive or snooze only
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        data-testid="closed-deal-archive-modal"
        data-ff-closed-deal-archive=""
      >
        <DialogHeader>
          <DialogTitle>{CLOSED_DEAL_ARCHIVE_TITLE}</DialogTitle>
          <DialogDescription>
            {dealTitle?.trim() ? dealTitle.trim() : "Closed deal"}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-navy">{CLOSED_DEAL_ARCHIVE_COPY}</p>
        <p className="text-xs text-muted-foreground">In-app reminder. Nothing emailed Javy.</p>
        <FollowUpSnoozePresets pending={pending} onSnooze={snooze} testId="deal-archive-snooze" />
        <DialogFooter>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void archiveNow()}
            data-testid="deal-archive-now"
          >
            Archive now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
