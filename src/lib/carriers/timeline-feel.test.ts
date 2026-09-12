import { describe, expect, it } from "vitest";
import {
  CarrierTimelineSection,
  type CarrierTimelineRow,
} from "@/components/carriers/carrier-timeline-section";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

function row(partial: Partial<CarrierTimelineRow> & Pick<CarrierTimelineRow, "id" | "title">): CarrierTimelineRow {
  return {
    kind: "field_update",
    actorName: "Javy",
    occurredAt: "2026-09-12T12:00:00.000Z",
    ...partial,
  };
}

describe("carrier timeline feel-pass", () => {
  it("groups related same-day events under an expandable entry", () => {
    const rows: CarrierTimelineRow[] = [
      row({ id: "1", title: "Appetite Notes Edited", reason: "Coastal OK", occurredAt: "2026-09-12T12:00:00.000Z" }),
      row({ id: "2", title: "Appetite Notes Edited", reason: "HO3 only", occurredAt: "2026-09-12T15:00:00.000Z" }),
    ];
    const html = renderToStaticMarkup(React.createElement(CarrierTimelineSection, { rows }));
    expect(html).toContain("data-ff-carrier-timeline-group");
    expect(html).toContain("2 related");
    expect(html).toContain("Show");
  });

  it("shows a one-line red reason for readiness/credential failures", () => {
    const rows: CarrierTimelineRow[] = [
      row({
        id: "3",
        kind: "credential",
        title: "Readiness check failed",
        reason: "Portal URL unreachable or returned an error. · HTTP 503",
        failed: true,
      }),
    ];
    const html = renderToStaticMarkup(React.createElement(CarrierTimelineSection, { rows }));
    expect(html).toContain("data-ff-carrier-timeline-fail");
    expect(html).toContain("Portal URL unreachable or returned an error. · HTTP 503");
  });

  it("keeps successful field-update detail as a muted one-liner (not a failure)", () => {
    const rows: CarrierTimelineRow[] = [
      row({
        id: "4",
        title: "Status → Pending",
        reason: "Was Active",
        failed: false,
      }),
    ];
    const html = renderToStaticMarkup(React.createElement(CarrierTimelineSection, { rows }));
    expect(html).toContain("data-ff-carrier-timeline-note");
    expect(html).toContain("Was Active");
    expect(html).not.toContain("data-ff-carrier-timeline-fail");
  });
});
