/** Client-only pub/sub so status → contacted can start the Response clock without waiting on RSC. */

export type LeadClockPatch = {
  leadId: string;
  dueAt: string | null;
  followUpName?: string | null;
};

type Listener = (patch: LeadClockPatch) => void;

const listeners = new Set<Listener>();

export function publishLeadClock(patch: LeadClockPatch) {
  for (const listener of listeners) listener(patch);
}

export function subscribeLeadClock(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
