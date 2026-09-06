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
    if (!firstContactAt) return;
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [firstContactAt]);

  if (!firstContactAt) {
    return (
      <span
        className="font-mono text-xs tabular-nums text-muted-foreground"
        data-overdue="false"
        data-timer="idle"
        title="Timer starts when first contact is logged"
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
        title="Time since first contact"
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
      data-timer="counting"
      title={state.overdue ? "More than 5 minutes since first contact" : "Time since first contact"}
    >
      {formatElapsedClock(state.elapsedMs)}
    </span>
  );
}
