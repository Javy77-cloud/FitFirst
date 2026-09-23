import { describe, expect, it } from "vitest";
import { DESK_TIME_ZONE, formatDeskDateTime } from "./desk-timezone";
import { formatInboxWhen, formatInboxListWhen } from "./inbox";
import { formatWhen } from "@/lib/activities/format";

describe("desk timezone", () => {
  it("formats UTC instants in America/New_York", () => {
    expect(DESK_TIME_ZONE).toBe("America/New_York");
    // 2026-09-23T14:52:20Z = 10:52 AM ET (EDT, UTC-4)
    const when = new Date("2026-09-23T14:52:20.000Z");
    expect(formatDeskDateTime(when)).toMatch(/10:52/);
    expect(formatInboxWhen(when)).toMatch(/10:52/);
    expect(formatWhen(when)).toMatch(/10:52/);
    expect(formatInboxWhen(when)).not.toMatch(/2:52/);
  });

  it("uses ET calendar day for list clocks", () => {
    const asOf = new Date("2026-09-23T20:00:00.000Z"); // 4pm ET
    const morning = new Date("2026-09-23T14:52:20.000Z"); // 10:52am ET same day
    expect(formatInboxListWhen(morning, asOf)).toMatch(/10:52/);
  });
});
