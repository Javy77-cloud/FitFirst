"use client";

import { useState } from "react";
import { snoozeDeskActivity } from "@/app/actions/activities-desk";
import { snoozeLeadFollowUpFromTask } from "@/app/actions/lead-follow-up";
import { CallButton } from "@/components/activities/call-button";
import { FollowUpSnoozePresets } from "@/components/leads/follow-up-snooze-presets";
import type { SoftphoneTarget } from "@/components/softphone/softphone-context";
import type { SnoozeDelayUnit } from "@/lib/leads/follow-up-templates";

export type DueCallCard = SoftphoneTarget & {
  whenLabel: string;
  overdue?: boolean;
};

export function DueCallPopups({ calls }: { calls: DueCallCard[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const visible = calls.filter((call) => !dismissed.includes(call.activityId));
  if (visible.length === 0) return null;

  async function snoozeCall(activityId: string, amount: number, unit: SnoozeDelayUnit) {
    setPendingId(activityId);
    const form = new FormData();
    form.set("activityId", activityId);
    form.set("amount", String(amount));
    form.set("unit", unit);
    await snoozeLeadFollowUpFromTask(form).catch(() => null);
    await snoozeDeskActivity(form);
    setDismissed((ids) => [...ids, activityId]);
    setPendingId(null);
  }

  return (
    <div className="pointer-events-none fixed top-3 right-3 z-50 flex w-[min(100%-1.5rem,22rem)] flex-col gap-2">
      {visible.map((call) => (
        <div
          key={call.activityId}
          className="pointer-events-auto rounded-lg border border-fit-flag/40 bg-card p-3 shadow-lg"
          data-ff-due-call-popup=""
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-fit-flag">
            {call.overdue ? "Overdue call" : "Due call"}
          </div>
          <p className="mt-1 text-base font-semibold text-navy">Hey, make this call</p>
          <p className="text-sm">{call.title}</p>
          <p className="text-base text-muted-foreground">
            {call.contactName ?? "Unnamed"}
            {call.policyNumber ? ` · ${call.policyNumber}` : ""} · {call.whenLabel}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <CallButton target={call} label="Phone" size="xs" />
          </div>
          <div className="mt-2">
            <p className="mb-1 text-[11px] font-medium text-navy">Snooze</p>
            <FollowUpSnoozePresets
              pending={pendingId === call.activityId}
              onSnooze={(amount, unit) => snoozeCall(call.activityId, amount, unit)}
              testId={`due-call-snooze-${call.activityId}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
