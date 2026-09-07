"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { releaseDueLeadFollowUpsNow } from "@/app/actions/lead-follow-up";
import { subscribeLeadClock } from "@/lib/leads/clock-sync";
import { formatCountdownClock, responseTimerState } from "@/lib/leads/queue";
import { cn } from "@/lib/utils";

/** Same on server and first client paint — live clock starts after mount. */
const CLOCK_PLACEHOLDER = "--:--";
const CLOCK_DONE = "—";

export function ResponseTimer({
  leadId,
  dueAt,
  done = false,
}: {
  leadId?: string;
  dueAt: string | null;
  done?: boolean;
}) {
  const router = useRouter();
  const [localDue, setLocalDue] = useState<string | null>(dueAt);
  const [localDone, setLocalDone] = useState(done);
  const [now, setNow] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    setLocalDue(dueAt);
    setLocalDone(done);
  }, [dueAt, done]);

  useEffect(() => {
    if (!leadId) return;
    return subscribeLeadClock((patch) => {
      if (patch.leadId !== leadId) return;
      setLocalDue(patch.dueAt);
      setLocalDone(Boolean(patch.done) && !patch.dueAt);
    });
  }, [leadId]);

  useEffect(() => {
    if (!localDue) {
      setNow(null);
      return;
    }
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [localDue]);

  useEffect(() => {
    fired.current = false;
  }, [localDue]);

  useEffect(() => {
    if (!localDue || now === null || fired.current) return;
    if (now < new Date(localDue).getTime()) return;
    fired.current = true;
    void releaseDueLeadFollowUpsNow().then(() => {
      router.refresh();
    });
  }, [localDue, now, router]);

  if (localDone && !localDue) {
    return (
      <span
        className="font-mono text-xs tabular-nums text-navy"
        data-overdue="false"
        data-timer="done"
        data-testid="response-timer"
        title="No more follow-up steps"
      >
        {CLOCK_DONE}
      </span>
    );
  }

  if (!localDue) {
    return (
      <span
        className="font-mono text-xs tabular-nums text-muted-foreground"
        data-overdue="false"
        data-timer="idle"
        data-testid="response-timer"
        title="Timer starts on the status this template is bound to"
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
        data-testid="response-timer"
        title="Next follow-up step"
      >
        {CLOCK_PLACEHOLDER}
      </span>
    );
  }

  const state = responseTimerState(localDue, new Date(now));

  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        state.overdue ? "font-semibold text-fit-red" : "text-navy",
      )}
      data-overdue={state.overdue ? "true" : "false"}
      data-timer={state.overdue ? "overdue" : "counting"}
      data-testid="response-timer"
      title={state.overdue ? "Step overdue — act on this lead" : "Time until the next follow-up step"}
    >
      {formatCountdownClock(state.remainingMs)}
    </span>
  );
}
