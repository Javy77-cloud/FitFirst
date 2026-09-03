"use client";

import { useState } from "react";
import { CallButton } from "@/components/activities/call-button";
import type { SoftphoneTarget } from "@/components/softphone/softphone-context";

export type DueCallCard = SoftphoneTarget & {
  whenLabel: string;
  overdue?: boolean;
};

export function DueCallPopups({ calls }: { calls: DueCallCard[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = calls.filter((call) => !dismissed.includes(call.activityId));
  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-3 right-3 z-50 flex w-[min(100%-1.5rem,22rem)] flex-col gap-2">
      {visible.map((call) => (
        <div
          key={call.activityId}
          className="pointer-events-auto rounded-lg border border-fit-flag/40 bg-card p-3 shadow-lg"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-fit-flag">
            {call.overdue ? "Overdue call" : "Due call"}
          </div>
          <p className="mt-1 text-sm font-semibold text-navy">Hey, make this call</p>
          <p className="text-sm">{call.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {call.contactName ?? "Unnamed"}
            {call.policyNumber ? ` · ${call.policyNumber}` : ""} · {call.whenLabel}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <CallButton target={call} label="Phone" size="xs" />
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setDismissed((ids) => [...ids, call.activityId])}
            >
              Later
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
