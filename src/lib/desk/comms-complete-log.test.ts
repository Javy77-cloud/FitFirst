import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shouldWriteCommsActivityLog } from "@/lib/lifecycle/activity";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("quick-comm open does not insert activity_logs", () => {
  it("gates writeDeskComms and logDeskActivity on shouldWriteCommsActivityLog", () => {
    const write = source("src/lib/desk/write-comms.ts");
    expect(write).toMatch(/shouldWriteCommsActivityLog/);
    expect(write).toMatch(/return \{ activity: null, threadKey, direction, eventType \}/);

    const desk = source("src/app/actions/activities-desk.ts");
    expect(desk).toMatch(/shouldWriteCommsActivityLog/);
    expect(desk).toMatch(/if \(\(kind === "call" \|\| kind === "email" \|\| kind === "sms"\) && !writeLog && !isScheduledComms\)/);
    expect(desk).toMatch(/if \(writeLog\) \{\s*await db\.insert\(activityLogs\)/s);

    const click = source("src/app/actions/click-to-call.ts");
    expect(click).not.toMatch(/writeDeskComms/);
    expect(click).not.toMatch(/activityLogs/);

    const queue = source("src/app/actions/lead-follow-up.ts");
    expect(queue).toMatch(/shouldWriteCommsActivityLog/);
    expect(queue).toMatch(/kind !== "call" && !sent/);
  });

  it("opens Call / SMS / Email without logging, and logs only on send or outcome", () => {
    const openOnly = [
      "src/components/deal-row-comms.tsx",
      "src/components/desk/contact-action-buttons.tsx",
      "src/components/click-to-call.tsx",
    ];
    for (const file of openOnly) {
      const text = source(file);
      expect(text, file).not.toMatch(/logDeskActivity/);
      expect(text, file).not.toMatch(/sendDeskSms/);
      expect(text, file).not.toMatch(/sendDeskEmail/);
      expect(text, file).not.toMatch(/writeDeskComms/);
      expect(text, file).not.toMatch(/logLeadQueueContact/);
    }

    const mixed = [
      "src/components/desk/record-quick-actions.tsx",
      "src/components/deals/deal-quick-actions.tsx",
      "src/components/policy/policy-quick-actions.tsx",
    ];
    for (const file of mixed) {
      const text = source(file);
      expect(text, file).toMatch(/window\.location\.href = href/);
      expect(text, file).not.toMatch(/await logDeskActivity\(form\);\s*if \(href/);
      expect(text, file).not.toMatch(/await sendDeskSms\(form\)/);
      expect(text, file).not.toMatch(/await sendDeskEmail\(form\)/);
    }

    const quick = source("src/components/comms/quick-comms-board.tsx");
    const callNow = quick.slice(quick.indexOf("function callNow"), quick.indexOf("return (", quick.indexOf("function callNow")));
    expect(callNow).not.toMatch(/logDeskActivity/);
    expect(callNow).toMatch(/window\.location\.href = dial/);
    expect(quick).toMatch(/await sendDeskSms\(formData\)/);
    expect(quick).toMatch(/await sendDeskEmail\(formData\)/);

    const header = source("src/components/desk/header-record-actions.tsx");
    const openFn = header.slice(
      header.indexOf("function openComposer"),
      header.indexOf("return (", header.indexOf("function openComposer")),
    );
    expect(openFn).not.toMatch(/logDeskActivity|sendDeskSms|sendDeskEmail/);
    expect(header).toMatch(/name="outcome"/);
    expect(header).toMatch(/await logDeskActivity\(formData\)/);
    expect(header).toMatch(/await sendDeskSms\(formData\)/);
    expect(header).toMatch(/await sendDeskEmail\(formData\)/);

    const comms = source("src/app/actions/comms.ts");
    expect(comms).toMatch(/eventType: "queued"/);
    expect(comms).toMatch(/eventType: "received"/);
    expect(shouldWriteCommsActivityLog({ kind: "sms", eventType: "queued" })).toBe(true);
    expect(shouldWriteCommsActivityLog({ kind: "email", eventType: "queued" })).toBe(true);
    expect(shouldWriteCommsActivityLog({ kind: "call", eventType: "logged" })).toBe(false);
  });
});
