import { describe, expect, it } from "vitest";
import { userIsSiteDeveloper } from "@/lib/developer/site-developer";
import {
  assertFloodSnapshotShape,
  assertGlSnapshotShape,
  assertWcSnapshotShape,
  buildFloodFeatureSnapshot,
  buildGlFeatureSnapshot,
  buildWcFeatureSnapshot,
  isFloodLearningLine,
  isGlLearningLine,
  isWcLearningLine,
} from "./line-learning-stubs";

describe("line learning stubs", () => {
  it("builds empty-ish Flood/WC/GL snapshot shapes", () => {
    const flood = buildFloodFeatureSnapshot({
      sheetValues: {
        flood_zone: { value: "AE", status: "confirmed", source: "agent" },
        elevation: { value: "12.4", status: "check", source: "extracted" },
        state: { value: "FL", status: "confirmed", source: "agent" },
      },
    });
    expect(assertFloodSnapshotShape(flood)).toEqual([]);
    expect(flood.floodZone).toBe("AE");

    const wc = buildWcFeatureSnapshot({
      sheetValues: {
        industry_class: { value: "8810", status: "confirmed", source: "agent" },
        employees: { value: "12", status: "confirmed", source: "agent" },
        payroll: { value: "480000", status: "confirmed", source: "agent" },
      },
    });
    expect(assertWcSnapshotShape(wc)).toEqual([]);
    expect(wc.industryClass).toBe("8810");
    expect(wc.employees).toBe(12);

    const gl = buildGlFeatureSnapshot({
      sheetValues: {
        industry_class: { value: "Restaurants", status: "confirmed", source: "agent" },
        revenue: { value: "1,200,000", status: "confirmed", source: "agent" },
      },
    });
    expect(assertGlSnapshotShape(gl)).toEqual([]);
    expect(gl.revenue).toBe(1200000);
  });

  it("recognizes line aliases", () => {
    expect(isFloodLearningLine("FLOOD")).toBe(true);
    expect(isWcLearningLine("WC")).toBe(true);
    expect(isGlLearningLine("GL")).toBe(true);
    expect(isFloodLearningLine("HO")).toBe(false);
  });

  it("uses same site-dev gate as Appetite Log", () => {
    expect(
      userIsSiteDeveloper(
        { email: "agent@fitfirst.local", isSiteDeveloper: false },
        { FF_SITE_DEVELOPER_EMAILS: "javy@fitfirst.local" },
      ),
    ).toBe(false);
    expect(
      userIsSiteDeveloper(
        { email: "javy@fitfirst.local", isSiteDeveloper: false },
        { FF_SITE_DEVELOPER_EMAILS: "javy@fitfirst.local" },
      ),
    ).toBe(true);
  });
});
