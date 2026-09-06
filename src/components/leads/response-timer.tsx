"use client";

import { useEffect, useState } from "react";
import { formatElapsedClock, responseTimerState } from "@/lib/leads/queue";
import { cn } from "@/lib/utils";

/** Same on server and first client paint — live clock starts after mount. */
const CLOCK_PLACEHOLDER = "--:--";

export function ResponseTimer({
  createdAt,
  firstContactAt,
}: {
  createdAt: string;
  firstContactAt: string | null;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (firstContactAt) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [firstContactAt]);

  if (firstContactAt) {
    return <span className="text-xs text-muted-foreground">Contacted</span>;
  }

  if (now === null) {
    return (
      <span
        className="font-mono text-xs tabular-nums text-navy"
        data-overdue="false"
        title="Time since arrival"
      >
        {CLOCK_PLACEHOLDER}
      </span>
    );
  }

  const state = responseTimerState(createdAt, firstContactAt, new Date(now));

  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        state.overdue ? "font-semibold text-fit-red" : "text-navy",
      )}
      data-overdue={state.overdue ? "true" : "false"}
      title={state.overdue ? "No first contact in 5 minutes" : "Time since arrival"}
    >
      {formatElapsedClock(state.elapsedMs)}
    </span>
  );
}
