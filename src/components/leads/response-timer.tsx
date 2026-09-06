"use client";

import { useEffect, useState } from "react";
import { formatElapsedClock, responseTimerState } from "@/lib/leads/queue";
import { cn } from "@/lib/utils";

export function ResponseTimer({
  createdAt,
  firstContactAt,
}: {
  createdAt: string;
  firstContactAt: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (firstContactAt) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [firstContactAt]);

  const state = responseTimerState(createdAt, firstContactAt, new Date(now));
  if (state.phase === "cleared") {
    return <span className="text-xs text-muted-foreground">Contacted</span>;
  }

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
