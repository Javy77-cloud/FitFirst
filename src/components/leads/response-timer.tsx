"use client";

import { useEffect, useRef, useState } from "react";
import { releaseDueLeadFollowUpsNow } from "@/app/actions/lead-follow-up";
import { formatCountdownClock, responseTimerState } from "@/lib/leads/queue";
import { cn } from "@/lib/utils";

/** Same on server and first client paint — live clock starts after mount. */
const CLOCK_PLACEHOLDER = "--:--";

export function ResponseTimer({ dueAt }: { dueAt: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!dueAt) return;
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [dueAt]);

  useEffect(() => {
    fired.current = false;
  }, [dueAt]);

  useEffect(() => {
    if (!dueAt || now === null || fired.current) return;
    if (now < new Date(dueAt).getTime()) return;
    fired.current = true;
    void releaseDueLeadFollowUpsNow();
  }, [dueAt, now]);

  if (!dueAt) {
    return (
      <span
        className="font-mono text-xs tabular-nums text-muted-foreground"
        data-overdue="false"
        data-timer="idle"
        title="Timer starts when status changes to contacted"
      >
        {CLOCK_PLACEHOLDER}
      </span>
    );
  }

  if (now === null) {
    return (
      <span
        className="font-mono text-xs tabular-nums text-navy"
        data-overdue="false"
        data-timer="pending"
        title="Next follow-up step"
      >
        {CLOCK_PLACEHOLDER}
      </span>
    );
  }

  const state = responseTimerState(dueAt, new Date(now));

  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        state.overdue ? "font-semibold text-fit-red" : "text-navy",
      )}
      data-overdue={state.overdue ? "true" : "false"}
      data-timer={state.overdue ? "overdue" : "counting"}
      title={state.overdue ? "Step overdue — act on this lead" : "Time until the next follow-up step"}
    >
      {formatCountdownClock(state.remainingMs)}
    </span>
  );
}
