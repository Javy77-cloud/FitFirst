import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { INSURANCE_SEQUENCES, sequenceBySlug, sequenceEmailTemplates } from "./catalog";
import { SEQUENCE_SLUGS, offsetLabel } from "./types";

describe("insurance campaign sequences", () => {
  it("ships exactly the five insurance sequences", () => {
    expect(INSURANCE_SEQUENCES.map((row) => row.slug)).toEqual([...SEQUENCE_SLUGS]);
    expect(sequenceBySlug("renewal_60_30")?.name).toBe("60 / 30 renewal");
    expect(sequenceBySlug("missing")).toBeUndefined();
  });

  it("every sequence has Task and email template stubs", () => {
    for (const sequence of INSURANCE_SEQUENCES) {
      const kinds = new Set(sequence.steps.map((step) => step.kind));
      expect(kinds.has("task"), sequence.slug).toBe(true);
      expect(kinds.has("email_template"), sequence.slug).toBe(true);
      expect(sequence.steps.length).toBeGreaterThanOrEqual(2);
      for (const step of sequence.steps) {
        if (step.kind === "task") {
          expect(step.taskTitle, step.key).toBeTruthy();
        } else {
          expect(step.emailSubject, step.key).toBeTruthy();
          expect(step.templateSlug, step.key).toBeTruthy();
        }
      }
    }
  });

  it("60/30 renewal fires before the date; review ask waits after bind", () => {
    const renewal = sequenceBySlug("renewal_60_30");
    expect(renewal?.steps.map((step) => step.offsetDays)).toEqual([-60, -60, -30, -30]);
    const review = sequenceBySlug("review_ask");
    expect(review?.steps.every((step) => step.offsetDays === 14)).toBe(true);
    expect(offsetLabel(-60, "renewal date")).toBe("60 days before renewal date");
    expect(offsetLabel(14, "bind / closed won")).toBe("14 days after bind / closed won");
    expect(offsetLabel(0, "lead created")).toBe("Same day as lead created");
  });

  it("does not treat Ana's $321k shop as written premium or a bound review", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.outcome.bindableAt321k).toBe(0);
    const quote = sequenceBySlug("quote_follow_up");
    expect(quote?.audience).toMatch(/unbound/i);
    const review = sequenceBySlug("review_ask");
    expect(review?.audience).toMatch(/not shopping-only/i);
    const bodies = sequenceEmailTemplates().map((tpl) => tpl.body).join("\n");
    expect(bodies).not.toMatch(/321,?000/);
    expect(bodies.toLowerCase()).not.toContain("ana dib");
  });

  it("exposes one work-email stub per email step", () => {
    const templates = sequenceEmailTemplates();
    expect(templates).toHaveLength(8);
    expect(new Set(templates.map((tpl) => tpl.slug)).size).toBe(8);
    expect(templates.some((tpl) => tpl.slug === "seq-renewal-60")).toBe(true);
    expect(templates.some((tpl) => tpl.slug === "seq-review-ask")).toBe(true);
  });
});
