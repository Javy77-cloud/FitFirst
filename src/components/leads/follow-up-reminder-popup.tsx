"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { markAlertRead } from "@/app/actions/alerts";
import { snoozeLeadFollowUpReminder } from "@/app/actions/lead-follow-up";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { followUpLeadHref, parseFollowUpNotification } from "@/lib/desk/notifications";
import { SNOOZE_DELAY_UNITS } from "@/lib/leads/follow-up-templates";
import { cn } from "@/lib/utils";

export type FollowUpPopupAlert = {
  id: string;
  title: string;
  body: string;
  leadId: string | null;
};

export function FollowUpReminderPopup({ alert }: { alert: FollowUpPopupAlert | null }) {
  const [open, setOpen] = useState(Boolean(alert));
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<(typeof SNOOZE_DELAY_UNITS)[number]>("hours");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setOpen(Boolean(alert));
    setAmount("1");
    setUnit("hours");
  }, [alert?.id]);

  if (!alert) return null;

  const copy = parseFollowUpNotification(alert);
  const href = followUpLeadHref(alert.leadId);

  async function dismiss() {
    const form = new FormData();
    form.set("alertId", alert.id);
    await markAlertRead(form);
    setOpen(false);
  }

  async function snooze() {
    setPending(true);
    const form = new FormData();
    form.set("alertId", alert.id);
    form.set("amount", amount);
    form.set("unit", unit);
    await snoozeLeadFollowUpReminder(form);
    setPending(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" data-testid="follow-up-reminder-popup">
        <DialogHeader>
          <DialogTitle>{copy.action}</DialogTitle>
          <DialogDescription>{copy.leadName}</DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">In-app follow-up. Nothing emailed Javy.</p>
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2">
          <label className="grid gap-1 text-xs font-medium text-navy">
            Snooze
            <Input
              type="number"
              min={1}
              max={30}
              name="amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-8 w-20"
              aria-label="Snooze amount"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-navy">
            Unit
            <select
              name="unit"
              value={unit}
              onChange={(event) =>
                setUnit(event.target.value === "days" ? "days" : "hours")
              }
              className="h-8 rounded-md border border-border bg-card px-2 text-sm text-navy"
              aria-label="Snooze unit"
            >
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void snooze()}
            data-testid="follow-up-snooze"
          >
            Snooze
          </Button>
        </div>
        <DialogFooter>
          {href ? (
            <Link href={href} className={cn(buttonVariants({ size: "sm" }))}>
              Open lead
            </Link>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={() => void dismiss()}>
            Mark as read
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
