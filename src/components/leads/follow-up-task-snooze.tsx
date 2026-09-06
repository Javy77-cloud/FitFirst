"use client";

import { useState } from "react";
import { snoozeLeadFollowUpFromTask } from "@/app/actions/lead-follow-up";
import { FollowUpSnoozePresets } from "@/components/leads/follow-up-snooze-presets";
import type { SnoozeDelayUnit } from "@/lib/leads/follow-up-templates";

export function FollowUpTaskSnooze({ activityId }: { activityId: string }) {
  const [pending, setPending] = useState(false);

  async function snooze(amount: number, unit: SnoozeDelayUnit) {
    setPending(true);
    const form = new FormData();
    form.set("activityId", activityId);
    form.set("amount", String(amount));
    form.set("unit", unit);
    await snoozeLeadFollowUpFromTask(form);
    setPending(false);
  }

  return (
    <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3" data-testid="follow-up-task-snooze">
      <p className="mb-2 text-xs font-medium text-navy">Snooze this follow-up</p>
      <FollowUpSnoozePresets pending={pending} onSnooze={snooze} testId="follow-up-task-snooze-presets" />
    </div>
  );
}
