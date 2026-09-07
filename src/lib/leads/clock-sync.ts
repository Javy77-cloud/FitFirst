/** Per-lead pub/sub so one row’s status / clock / template never rewrite another row. */

export type LeadClockPatch = {
  leadId: string;
  dueAt: string | null;
  followUpName?: string | null;
  done?: boolean;
};

type Listener = (patch: LeadClockPatch) => void;

const listeners = new Set<Listener>();
const byLead = new Map<string, LeadClockPatch>();

export function publishLeadClock(patch: LeadClockPatch | null | undefined) {
  if (!patch?.leadId) return;
  const next: LeadClockPatch = {
    leadId: patch.leadId,
    dueAt: patch.dueAt ?? null,
    followUpName: patch.followUpName ?? null,
    done: Boolean(patch.done),
  };
  byLead.set(next.leadId, next);
  for (const listener of listeners) {
    try {
      listener(next);
    } catch {
      /* one row must not take down the table */
    }
  }
}

export function peekLeadClock(leadId: string | null | undefined): LeadClockPatch | null {
  if (!leadId) return null;
  return byLead.get(leadId) ?? null;
}

export function subscribeLeadClock(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
