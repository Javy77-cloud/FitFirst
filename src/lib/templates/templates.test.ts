import { describe, expect, it } from "vitest";
import { AGENCY_BRAND } from "@/lib/domain";
import { addDelay, archiveCancelsEmailJobs } from "./dates";
import { templateLanguageLabel, templateLocaleCopy } from "./library";
import { isProtectedAnaContact, pickEmailLocale } from "./locale";
import { mergeTemplate } from "./merge";

describe("pickEmailLocale", () => {
  it("uses Spanish for ES, English for everything else", () => {
    expect(pickEmailLocale("Spanish")).toBe("es");
    expect(pickEmailLocale("español")).toBe("es");
    expect(pickEmailLocale("en")).toBe("en");
    expect(pickEmailLocale("English")).toBe("en");
    expect(pickEmailLocale("Creole")).toBe("en");
    expect(pickEmailLocale("Haitian Creole")).toBe("en");
    expect(pickEmailLocale("")).toBe("en");
    expect(pickEmailLocale(null)).toBe("en");
  });
});

describe("isProtectedAnaContact", () => {
  it("blocks Ana Dib and never treats Marcus as Ana", () => {
    expect(isProtectedAnaContact({ firstName: "Ana", lastName: "Dib" })).toBe(true);
    expect(isProtectedAnaContact({ firstName: "Marcus", lastName: "Bell" })).toBe(false);
  });
});

describe("mergeTemplate", () => {
  it("fills brand merge fields without inventing a street address", () => {
    const text = mergeTemplate(
      "Hi {{contact_first_name}} from {{agency_name}} — {{policy_type}} on {{won_date}}. Call {{agent_phone}}. {{review_link}}",
      {
        contactFirstName: "Marcus",
        policyType: "HO",
        wonDate: new Date("2026-08-30T16:00:00.000Z"),
      },
    );
    expect(text).toContain("Hi Marcus from Javier Garcia Insurance");
    expect(text).toContain("HO on 8-30-2026");
    expect(text).toContain(AGENCY_BRAND.phone);
    expect(text).toContain("[Google review link]");
    expect(text).not.toMatch(/\d{2,5}\s+\w+\s+(St|Ave|Ct|Rd)/i);
  });
});

describe("mergeTemplate signature", () => {
  it("replaces {{signature}} with the agency close", () => {
    const text = mergeTemplate("Thanks.\n\n{{signature}}", {
      contactFirstName: "Marcus",
      policyType: "HO",
      wonDate: null,
      signature: "Javy\nFitFirst",
    });
    expect(text).toContain("Javy\nFitFirst");
    expect(text).not.toContain("{{signature}}");
  });
});

describe("template library EN/ES", () => {
  it("marks both languages ready and never claims a send", () => {
    const copy = templateLocaleCopy({
      subjectEn: "Renewal is coming",
      bodyEn: "I will write before it.",
      subjectEs: "Se acerca tu renovación",
      bodyEs: "Te escribo con tiempo.",
    });
    expect(copy.enReady).toBe(true);
    expect(copy.esReady).toBe(true);
    expect(copy.sends).toBe(false);
    expect(templateLanguageLabel(copy)).toBe("EN + ES ready");
  });

  it("falls back to the legacy subject/body for English only", () => {
    const copy = templateLocaleCopy({
      subject: "Thanks",
      body: "Example copy.",
    });
    expect(copy.enReady).toBe(true);
    expect(copy.esReady).toBe(false);
    expect(templateLanguageLabel(copy)).toBe("EN ready · ES missing");
  });
});

describe("schedule anchors", () => {
  it("computes Closed Won + 4 days and + 4 months from the won date", () => {
    const won = new Date("2026-08-30T16:00:00.000Z");
    expect(addDelay(won, 4, "days").toISOString()).toBe("2026-09-03T16:00:00.000Z");
    expect(addDelay(won, 4, "months").toISOString()).toBe("2026-12-30T16:00:00.000Z");
  });

  it("does not cancel jobs when a deal is archived", () => {
    expect(archiveCancelsEmailJobs()).toBe(false);
  });
});
