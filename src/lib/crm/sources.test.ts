import { describe, expect, it } from "vitest";
import {
  DESK_INTAKE_SOURCES,
  INDUSTRY_SOURCES,
  LEAD_SOURCES,
  RECORD_SOURCES,
  isKnownSource,
  normalizeRecordSource,
  sourceFilterOptions,
  sourceLabel,
} from "./sources";

describe("shared record sources", () => {
  it("covers the insurance-industry set the desk picklists share", () => {
    const values = INDUSTRY_SOURCES.map((row) => row.value);
    expect(values).toEqual(
      expect.arrayContaining([
        "referral",
        "google",
        "facebook",
        "instagram",
        "website",
        "call_in",
        "walk_in",
        "partner",
        "aor",
        "cross_sell",
        "renewal",
        "direct_mail",
        "radio_tv",
        "event",
        "other",
      ]),
    );
    expect(INDUSTRY_SOURCES.at(-1)?.value).toBe("other");
  });

  it("keeps desk-intake values so seeded Ana / Elena / inbound rows stay valid", () => {
    expect(LEAD_SOURCES).toEqual(
      expect.arrayContaining([
        "manual",
        "book",
        "dropped_dec",
        "dec_drop",
        "email_stub",
        "social_stub",
        "inbound_email",
        "facebook",
        "instagram",
        "google_business_profile",
      ]),
    );
    expect(DESK_INTAKE_SOURCES.map((row) => row.value)).toEqual(
      expect.arrayContaining(["manual", "dropped_dec", "dec_drop", "inbound_email"]),
    );
  });

  it("exposes one value list for every module picklist", () => {
    expect(LEAD_SOURCES).toEqual(RECORD_SOURCES.map((row) => row.value));
    expect(new Set(LEAD_SOURCES).size).toBe(LEAD_SOURCES.length);
    expect(isKnownSource("aor")).toBe(true);
    expect(isKnownSource("not-a-source")).toBe(false);
    expect(sourceLabel("radio_tv")).toBe("Radio / TV");
    expect(sourceLabel("book")).toBe("Book of business");
    expect(sourceLabel("dropped_dec")).toBe("Dropped dec");
    expect(sourceLabel(null)).toBe("—");
    expect(sourceLabel("custom_radio")).toBe("custom radio");
    expect(normalizeRecordSource("  google  ")).toBe("google");
    expect(normalizeRecordSource("", "manual")).toBe("manual");
    expect(sourceFilterOptions().some((row) => row.value === "cross_sell" && row.label === "Cross-sell")).toBe(
      true,
    );
  });
});
