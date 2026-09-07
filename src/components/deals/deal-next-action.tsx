"use client";

import { useEffect, useState } from "react";
import { dealNextActionState } from "@/lib/deals/pipeline-desk";
import { cn } from "@/lib/utils";

export function DealNextActionTimer({ dueAt }: { dueAt: string | null }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!dueAt) {
      setNow(null);
      return;
    }
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [dueAt]);

  if (!dueAt) {
    return (
      <span
        className="font-mono text-xs tabular-nums text-muted-foreground"
        data-testid="deal-next-action"
        data-overdue="false"
        title="No follow-up scheduled"
      >
        --:--
      </span>
    );
  }

  if (now === null) {
    return (
      <span
        className="font-mono text-xs tabular-nums text-navy"
        data-testid="deal-next-action"
        data-overdue="false"
        title="Next follow-up"
      >
        --:--
      </span>
    );
  }

  const state = dealNextActionState(dueAt, new Date(now));
  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        state.overdue ? "font-semibold text-fit-red" : "text-navy",
      )}
      data-testid="deal-next-action"
      data-overdue={state.overdue ? "true" : "false"}
      title={state.overdue ? "Follow-up overdue" : "Countdown to the next follow-up"}
    >
      {state.label}
    </span>
  );
}
