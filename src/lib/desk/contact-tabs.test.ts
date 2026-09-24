import { describe, expect, it } from "vitest";
import {
  contactPanelIdForSection,
  contactTabFromSection,
  parseContactTab,
  sectionMatchesActiveTab,
} from "./contact-tabs";
import { needsContactDetailsV4Upgrade, contactCardLayout } from "@/lib/contacts/contact-field-catalog";

describe("contact tabs URL", () => {
  it("defaults to glance and maps details/section aliases", () => {
    expect(parseContactTab(undefined, undefined)).toBe("glance");
    expect(parseContactTab("details", null)).toBe("details");
    expect(parseContactTab(null, "coverage")).toBe("coverage");
    expect(parseContactTab("contact-details", null)).toBe("details");
    expect(parseContactTab("at-a-glance", null)).toBe("glance");
    expect(parseContactTab(null, "emails")).toBe("communications");
  });

  it("maps section ids to panel tabs including communications collapse", () => {
    expect(contactTabFromSection("at-a-glance")).toBe("glance");
    expect(contactTabFromSection("contact-details")).toBe("details");
    expect(contactPanelIdForSection("sms")).toBe("communications");
    expect(sectionMatchesActiveTab("meetings", "communications")).toBe(true);
    expect(sectionMatchesActiveTab("policies", "policies")).toBe(true);
    expect(sectionMatchesActiveTab("policies", "deals")).toBe(false);
  });
});

describe("contact details v4 layout", () => {
  it("ships nickname + dependents and drops coverage from Details", () => {
    const layout = contactCardLayout();
    const keys = layout.columns.flatMap((c) => c.sections.flatMap((s) => s.fieldKeys));
    expect(keys).toContain("nickname");
    expect(keys).toContain("dependents");
    expect(keys).toContain("drivers_license_number");
    expect(keys).not.toContain("education_level");
    const ids = layout.columns.flatMap((c) => c.sections.map((s) => s.id));
    expect(ids).toEqual(["identity", "prefs", "intake"]);
    expect(needsContactDetailsV4Upgrade(layout)).toBe(false);
  });

  it("flags pre-v4 stock layouts for upgrade", () => {
    const old = {
      columns: [
        {
          id: "left",
          sections: [
            {
              id: "identity",
              label: "Contact",
              fieldKeys: ["first_name", "last_name", "email", "phone"],
            },
            {
              id: "prefs",
              label: "Preferences",
              fieldKeys: ["occupation", "education_level"],
            },
          ],
        },
        {
          id: "right",
          sections: [
            { id: "coverage", label: "Coverage", fieldKeys: ["existing_coverage_types"] },
            { id: "intake", label: "Lead Source", fieldKeys: ["source"] },
          ],
        },
      ],
    } as ReturnType<typeof contactCardLayout>;
    expect(needsContactDetailsV4Upgrade(old)).toBe(true);
  });
});
