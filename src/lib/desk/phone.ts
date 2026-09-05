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
      title: "Line marked for later",
      body: `${line.providerLabel} is a stub${line.displayFrom ? ` · ${line.displayFrom}` : ""}. FitFirst does not buy numbers or store Twilio keys. Outcome still writes to the activity log.`,
    };
  }
  return {
    title: "Connect a line later",
    body: "Bring your own trunk when the agency is ready. No Twilio purchase from this desk. The dialer below logs the call outcome on activities — it does not place a PSTN call.",
  };
}

export function isCallOutcome(value: string): value is CallOutcome {
  return (CALL_OUTCOMES as readonly string[]).includes(value);
}

export function formatCallOutcome(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}
