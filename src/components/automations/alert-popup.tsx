"use client";

import { useState } from "react";
import Link from "next/link";
import { markAlertRead } from "@/app/actions/alerts";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type PopupAlert = {
  id: string;
  title: string;
  body: string;
  href: string | null;
};

export function AutomationAlertPopup({ alert }: { alert: PopupAlert | null }) {
  const [open, setOpen] = useState(Boolean(alert));
  if (!alert) return null;

  async function dismiss() {
    if (!alert) return;
    const form = new FormData();
    form.set("alertId", alert.id);
    await markAlertRead(form);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" data-testid="automation-alert-popup">
        <DialogHeader>
          <DialogTitle>{alert.title}</DialogTitle>
          <DialogDescription>{alert.body}</DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          In-desk playbook ping. Nothing emailed Javy or the client.
        </p>
        <DialogFooter>
          {alert.href ? (
            <Link href={alert.href} className={cn(buttonVariants({ size: "sm" }))}>
              Open record
            </Link>
          ) : (
            <Link href="/automations/playbooks" className={cn(buttonVariants({ size: "sm" }))}>
              Open playbooks
            </Link>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => void dismiss()}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
