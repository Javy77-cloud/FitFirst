import { describe, expect, it } from "vitest";
import { formatBusySyncedAt, shouldAutoSyncBusy } from "./calendar-sync";

describe("calendar busy auto-sync", () => {
  const asOf = new Date("2026-09-19T17:00:00.000Z");

  it("syncs when never stamped or older than 15 minutes", () => {
    expect(shouldAutoSyncBusy(null, asOf)).toBe(true);
    expect(shouldAutoSyncBusy(new Date("2026-09-19T16:40:00.000Z"), asOf)).toBe(true);
    expect(shouldAutoSyncBusy(new Date("2026-09-19T16:50:00.000Z"), asOf)).toBe(false);
  });

  it("formats last synced for the desk", () => {
    expect(formatBusySyncedAt(null)).toBe("Never synced");
    expect(formatBusySyncedAt(new Date("2026-09-19T16:50:00.000Z"))).toMatch(/Sep/);
  });
});
