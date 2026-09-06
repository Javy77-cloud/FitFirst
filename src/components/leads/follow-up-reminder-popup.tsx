"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { markAlertRead } from "@/app/actions/alerts";
import { hideFollowUpModalForLead, snoozeLeadFollowUpReminder } from "@/app/actions/lead-follow-up";
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
import { followUpLeadHref, parseFollowUpNotification } from "@/lib/desk/notifications";
import type { SnoozeDelayUnit } from "@/lib/leads/follow-up-templates";

export type FollowUpPopupAlert = {
  id: string;
  title: string;
  body: string;
  leadId: string | null;
};

export function FollowUpReminderPopup({
  alert,
  playbook,
}: {
  alert: FollowUpPopupAlert | null;
  playbook?: { id: string; title: string; body: string; href: string | null } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const current = alert && alert.leadId && pathname === `/leads/${alert.leadId}` ? null : alert;
  const shown = current
    ? { kind: "follow-up" as const, ...current }
    : playbook
      ? { kind: "playbook" as const, ...playbook }
      : null;
  const [open, setOpen] = useState(Boolean(shown));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setOpen(Boolean(shown));
  }, [shown?.id, shown?.kind]);

  if (!shown) return null;

  async function dismissFollowUp() {
    if (shown?.kind !== "follow-up") return;
    const form = new FormData();
    form.set("alertId", shown.id);
    await markAlertRead(form);
    setOpen(false);
  }

  async function openLead() {
    if (shown?.kind !== "follow-up" || !shown.leadId) return;
    const form = new FormData();
    form.set("alertId", shown.id);
    form.set("leadId", shown.leadId);
    await hideFollowUpModalForLead(form);
    setOpen(false);
    const href = followUpLeadHref(shown.leadId);
    if (href) router.push(href);
  }

  async function snooze(amount: number, unit: SnoozeDelayUnit) {
    if (shown?.kind !== "follow-up") return;
    setPending(true);
    const form = new FormData();
    form.set("alertId", shown.id);
    form.set("amount", String(amount));
    form.set("unit", unit);
    await snoozeLeadFollowUpReminder(form);
    setPending(false);
    setOpen(false);
  }

  async function dismissPlaybook() {
    if (shown?.kind !== "playbook") return;
    const form = new FormData();
    form.set("alertId", shown.id);
    await markAlertRead(form);
    setOpen(false);
  }

  const copy = shown.kind === "follow-up" ? parseFollowUpNotification(shown) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : undefined)}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        data-testid="app-notification-modal"
      >
        {shown.kind === "follow-up" && copy ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.action}</DialogTitle>
              <DialogDescription>{copy.leadName}</DialogDescription>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">In-app follow-up. Nothing emailed Javy.</p>
            <FollowUpSnoozePresets pending={pending} onSnooze={snooze} />
            <DialogFooter>
              {shown.leadId ? (
                <Button type="button" size="sm" onClick={() => void openLead()} data-testid="follow-up-open-lead">
                  Open lead
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={() => void dismissFollowUp()}>
                Mark as read
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{shown.title}</DialogTitle>
              <DialogDescription>{shown.body}</DialogDescription>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">In-desk playbook ping. Nothing emailed Javy.</p>
            <DialogFooter>
              <Button type="button" size="sm" variant="outline" onClick={() => void dismissPlaybook()}>
                Dismiss
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
