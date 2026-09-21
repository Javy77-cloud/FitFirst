import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  decideDeskEmailDelivery,
  GMAIL_NOT_CONNECTED_MESSAGE,
  isDueNowOrPast,
  parseDeskEmailIntent,
} from "./desk-email-delivery";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("desk email delivery (send-now vs remind)", () => {
  const now = new Date("2026-09-21T15:00:00.000Z");

  it("parses Send now / schedule / remind intents", () => {
    expect(parseDeskEmailIntent("now")).toBe("now");
    expect(parseDeskEmailIntent("send_now")).toBe("now");
    expect(parseDeskEmailIntent("schedule")).toBe("schedule");
    expect(parseDeskEmailIntent("remind")).toBe("remind");
    expect(parseDeskEmailIntent("reminder")).toBe("remind");
    expect(parseDeskEmailIntent("")).toBeNull();
    expect(parseDeskEmailIntent("queued")).toBeNull();
  });

  it("Send now always delivers through Gmail, even with a future dueAt", () => {
    expect(
      decideDeskEmailDelivery({
        intent: "now",
        dueAt: new Date("2026-12-01T12:00:00.000Z"),
        now,
      }),
    ).toBe("send");
    expect(decideDeskEmailDelivery({ intent: "now", dueAt: null, now })).toBe("send");
  });

  it("remind never sends", () => {
    expect(decideDeskEmailDelivery({ intent: "remind", dueAt: null, now })).toBe("remind");
    expect(
      decideDeskEmailDelivery({
        intent: "remind",
        dueAt: new Date("2026-09-21T14:00:00.000Z"),
        now,
      }),
    ).toBe("remind");
  });

  it("schedule-due-now sends; future schedule stays queued", () => {
    expect(
      decideDeskEmailDelivery({
        intent: "schedule",
        dueAt: new Date("2026-09-21T14:59:00.000Z"),
        now,
      }),
    ).toBe("send");
    expect(
      decideDeskEmailDelivery({
        intent: "schedule",
        dueAt: new Date("2026-09-21T15:00:00.000Z"),
        now,
      }),
    ).toBe("send");
    expect(
      decideDeskEmailDelivery({
        intent: "schedule",
        dueAt: new Date("2026-09-22T15:00:00.000Z"),
        now,
      }),
    ).toBe("queue");
    expect(decideDeskEmailDelivery({ intent: "schedule", dueAt: null, now })).toBe("send");
  });

  it("legacy callers without intent stay queued (no silent mass send)", () => {
    expect(decideDeskEmailDelivery({ intent: null, dueAt: null, now })).toBe("queue");
    expect(decideDeskEmailDelivery({ intent: "", dueAt: now, now })).toBe("queue");
  });

  it("treats missing/invalid dueAt as due now", () => {
    expect(isDueNowOrPast(null, now)).toBe(true);
    expect(isDueNowOrPast(undefined, now)).toBe(true);
    expect(isDueNowOrPast(new Date("not-a-date"), now)).toBe(true);
    expect(isDueNowOrPast(new Date("2026-09-22T00:00:00.000Z"), now)).toBe(false);
  });

  it("sendDeskEmail live-sends through sendGmailMessage and fails closed when Gmail is down", () => {
    const comms = source("src/app/actions/comms.ts");
    expect(comms).toMatch(/decideDeskEmailDelivery/);
    expect(comms).toMatch(/sendGmailMessage/);
    expect(comms).toMatch(/gmailIsReady/);
    expect(comms).toMatch(/GMAIL_NOT_CONNECTED_MESSAGE/);
    expect(comms).toMatch(/eventType: liveSend \? "sent" : "queued"/);
    expect(comms).not.toMatch(/would_send/);
    expect(GMAIL_NOT_CONNECTED_MESSAGE).toMatch(/Settings → Integrations/);
    expect(GMAIL_NOT_CONNECTED_MESSAGE).toMatch(/Inbox → Connect Gmail/);
  });

  it("Quick Comms Send now calls sendDeskEmail; remind only logs", () => {
    const board = source("src/components/comms/quick-comms-board.tsx");
    expect(board).toMatch(/value: "now", label: "Send now"/);
    expect(board).toMatch(/Set reminder \(do not send\)/);
    expect(board).toMatch(/intent === "remind" \|\| emailMode === "remind"/);
    expect(board).toMatch(/intent === "now" \|\| emailMode === "now"/);
    expect(board).toMatch(/await sendDeskEmail\(formData\)/);
    expect(board).toMatch(/await logDeskActivity\(formData\)/);
    expect(board).toMatch(/formData\.set\("intent", "now"\)/);
    expect(board).toMatch(/formData\.set\("createReminder", "1"\)/);
  });
});
