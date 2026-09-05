import { CALL_OUTCOMES, type CallOutcome } from "@/lib/domain";

export type PhoneLineStatus = {
  connected: boolean;
  providerLabel: string;
  displayFrom: string | null;
};

export function phoneLineWallCopy(line: PhoneLineStatus): {
  title: string;
  body: string;
} {
  if (line.connected) {
    return {
      title: "Line marked — not live",
      body: `${line.providerLabel}${line.displayFrom ? ` · ${line.displayFrom}` : ""}. Twilio is not wired. Log a call on the book — nothing dials from this desk.`,
    };
  }
  return {
    title: "Connect your phone line",
    body: "Bring your own Twilio or SIP trunk when the agency is ready. FitFirst does not buy numbers. Log a call below — it writes to the activity log and does not place a PSTN call.",
  };
}

export function isCallOutcome(value: string): value is CallOutcome {
  return (CALL_OUTCOMES as readonly string[]).includes(value);
}

export function formatCallOutcome(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}
