import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sequenceEmailTemplates } from "@/lib/campaign-sequences/catalog";
import { SEEDED_TEMPLATE_COPY } from "@/lib/templates/copy";
import { listDeskEmailInventory } from "@/lib/templates/inventory";
import {
  TEMPLATE_REVISIONS,
  chosenDrop,
  deskFallbackCopy,
  fillNamedTokens,
  jobBlockedByChosenDrop,
  resolveTemplateText,
  wireJobAllowed,
  type TemplateRevision,
} from "@/lib/templates/revision";

const doc = readFileSync("docs/email-template-weekend-revision.md", "utf8");

describe("desk email inventory", () => {
  const rows = listDeskEmailInventory();

  it("covers every revision key and no extras", () => {
    expect(rows.map((row) => row.key).sort()).toEqual(Object.keys(TEMPLATE_REVISIONS).sort());
  });

  it("records that agency life and health toggles do not gate these templates", () => {
    expect(rows.every((row) => row.healthLifeGate === "none")).toBe(true);
    expect(doc).toMatch(/writeLife/);
    expect(doc).toMatch(/writeHealth/);
  });

  it("is listed in the weekend revision pack", () => {
    for (const row of rows) {
      expect(doc, row.key).toContain(row.key);
      expect(row.subject.length).toBeGreaterThan(0);
      expect(row.body.length).toBeGreaterThan(0);
      expect(row.fires.length).toBeGreaterThan(0);
      expect(row.sendPath.length).toBeGreaterThan(0);
    }
  });
});

describe("template revisions", () => {
  it("stays draft so current copy is what sends", () => {
    for (const [key, row] of Object.entries(TEMPLATE_REVISIONS)) {
      expect(row.status, key).toBe("draft");
      const resolved = resolveTemplateText(key, "en", { subject: "Current subject", body: "Current body" });
      expect(resolved).toEqual({ send: true, subject: "Current subject", body: "Current body" });
    }
  });

  it("keeps the seeded example close until a rewrite is chosen", () => {
    expect(SEEDED_TEMPLATE_COPY.googleReview.bodyEn).toMatch(/Example copy/);
    expect(SEEDED_TEMPLATE_COPY.renewal.bodyEn).toMatch(/Javier/);
    const resolved = resolveTemplateText("renewal-awareness", "en", {
      subject: SEEDED_TEMPLATE_COPY.renewal.subjectEn,
      body: SEEDED_TEMPLATE_COPY.renewal.bodyEn,
    });
    expect(resolved.send).toBe(true);
    if (resolved.send) expect(resolved.body).toMatch(/Example copy/);
  });

  it("uses a chosen rewrite and skips a chosen drop", () => {
    const revisions: Record<string, TemplateRevision> = {
      "client-quote": {
        decision: "rewrite",
        status: "chosen",
        subject: "Your quote — {{agency_name}}",
        body: "Hi {{contact_first_name}}\n\n{{signature}}",
      },
      "wire-thank-you": { decision: "drop", status: "chosen" },
    };
    expect(
      resolveTemplateText("client-quote", "en", { subject: "old", body: "old" }, revisions),
    ).toEqual({
      send: true,
      subject: "Your quote — {{agency_name}}",
      body: "Hi {{contact_first_name}}\n\n{{signature}}",
    });
    expect(resolveTemplateText("wire-thank-you", "en", { subject: "old", body: "old" }, revisions)).toEqual({
      send: false,
    });
    expect(chosenDrop("wire-thank-you", revisions)).toBe(true);
    expect(wireJobAllowed("thank_you", revisions)).toBe(false);
    expect(wireJobAllowed("google_review", revisions)).toBe(true);
    expect(
      jobBlockedByChosenDrop(
        { slug: "thank-you", jobBody: "Hung on won date. ARCHIVE must not cancel this.", templateBody: "Hung on won date. ARCHIVE must not cancel this." },
        revisions,
      ),
    ).toBe(true);
    expect(
      jobBlockedByChosenDrop(
        { slug: "wire-thank-you", jobBody: "", templateBody: "Hung on won date. ARCHIVE must not cancel this." },
        revisions,
      ),
    ).toBe(true);
    expect(
      jobBlockedByChosenDrop(
        { slug: "wire-thank-you", jobBody: "A letter the agent already wrote.", templateBody: "stub" },
        revisions,
      ),
    ).toBe(false);
  });

  it("asks rewrites for a first-name greeting and a signature slot", () => {
    for (const [key, row] of Object.entries(TEMPLATE_REVISIONS)) {
      if (row.decision !== "rewrite") continue;
      expect(row.body, key).toMatch(/\{\{\s*contact_first_name\s*\}\}/);
      expect(row.body, key).toMatch(/\{\{\s*signature\s*\}\}/);
      expect(row.body, key).not.toMatch(/Example copy/);
      expect(row.body, key).not.toMatch(/No SMTP/);
      expect(row.body, key).not.toMatch(/Your FitFirst agent/);
    }
    const sequences = sequenceEmailTemplates();
    for (const template of sequences) {
      expect(template.body).toMatch(/contact_first_name/);
      expect(template.body).toMatch(/\{\{signature\}\}/);
      expect(TEMPLATE_REVISIONS[template.slug].decision).toBe("keep");
    }
  });

  it("prefers English template columns over the empty legacy subject", () => {
    const copy = deskFallbackCopy("google-review-request", {
      subject: "",
      body: "",
      subjectEn: "Quick Google review? — {{agency_name}}",
      bodyEn: "Hi {{contact_first_name}}",
    });
    expect(copy).toEqual({
      send: true,
      subject: "Quick Google review? — {{agency_name}}",
      body: "Hi {{contact_first_name}}",
    });
  });

  it("fills chase tokens without leaving a signature placeholder", () => {
    const text = fillNamedTokens("Hi {{contact_first_name}} — {{days_phrase_lower}}\n\n{{signature}}", {
      contact_first_name: "Elena",
      days_phrase_lower: "expires in 12 days",
      signature: "",
    });
    expect(text).toContain("Hi Elena");
    expect(text).not.toContain("{{");
  });
});
