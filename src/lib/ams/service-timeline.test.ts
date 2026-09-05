import { describe, expect, it } from "vitest";
import { SERVICE_TIMELINE_DISCLAIMER } from "@/lib/domain-ams";
import {
  buildServiceTimelineRow,
  filterServiceTimeline,
  serviceNoteTitle,
  serviceTimelineFilesPolicy,
  sortServiceTimeline,
  validateServiceNote,
} from "./service-timeline";

describe("policy service timeline", () => {
  it("keeps AMS servicing events and drops meetings / calls", () => {
    const rows = filterServiceTimeline([
      { eventType: "endorsement_drafted", body: "Mortgagee stub" },
      { eventType: "meeting_scheduled", body: "30-day check-in" },
      { eventType: "service_note", body: "Called Elena" },
      { eventType: "call_logged", body: "Dialer note" },
    ]);
    expect(rows.map((row) => row.eventType)).toEqual(["endorsement_drafted", "service_note"]);
    expect(serviceTimelineFilesPolicy()).toBe(false);
    expect(SERVICE_TIMELINE_DISCLAIMER.toLowerCase()).toContain("does not file");
    expect(serviceNoteTitle("HO3-ELENA-2026")).toContain("HO3-ELENA-2026");
  });

  it("labels a servicing note and sorts newest first", () => {
    const parsed = validateServiceNote("  Called the mortgagee. Do not file.  ");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(validateServiceNote("   ").ok).toBe(false);
    const labeled = buildServiceTimelineRow({
      id: "1",
      eventType: "service_note",
      body: parsed.body,
      occurredAt: "2026-09-05T17:40:00.000Z",
    });
    expect(labeled.label).toBe("Servicing note");
    const sorted = sortServiceTimeline([
      { occurredAt: "2026-09-01T12:00:00.000Z", eventType: "older" },
      { occurredAt: "2026-09-05T17:40:00.000Z", eventType: "newer" },
    ]);
    expect(sorted[0]?.eventType).toBe("newer");
  });
});
