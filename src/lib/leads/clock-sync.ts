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

export function publishLeadClock(patch: LeadClockPatch) {
  if (!patch.leadId) return;
  byLead.set(patch.leadId, patch);
  for (const listener of listeners) listener(patch);
}

export function peekLeadClock(leadId: string): LeadClockPatch | null {
  return byLead.get(leadId) ?? null;
}

export function subscribeLeadClock(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
