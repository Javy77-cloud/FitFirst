import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import {
  CONTACT_PARITY_SECTION_FIELD_KEYS,
  ensureContactParityDealLayout,
  isDealPreferencesSection,
  needsContactParityDealLayout,
} from "@/lib/custom-fields/contact-parity-fields";
import { defaultLayoutForLine } from "@/lib/custom-fields/defaults";
import { deleteSection } from "@/lib/custom-fields/layout";
import type { FieldLayout } from "@/lib/custom-fields/types";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";
import { layoutForActiveProduct } from "./product-layout";

const STALE_PREFERENCES: FieldLayout = {
  columns: [
    {
      id: "left",
      sections: [
        { id: "contact", label: "Contact", fieldKeys: ["first_name", "phone"] },
        { id: "applicant", label: "Applicant", fieldKeys: ["applicant_gender"] },
      ],
    },
    {
      id: "right",
      sections: [
        { id: "co_applicant", label: "Co-applicant", fieldKeys: ["co_applicant_first_name"] },
        {
          id: "prefs",
          label: "Preferences",
          fieldKeys: [...CONTACT_PARITY_SECTION_FIELD_KEYS],
        },
        { id: "intake", label: "Intake", fieldKeys: ["source", "referral", "campaign_tag"] },
        { id: "pipeline", label: "Pipeline", fieldKeys: ["insurance_type"] },
      ],
    },
  ],
};

describe("Deal Preferences section stays gone", () => {
  it("matches the retired card by title or by its field keys alone", () => {
    expect(isDealPreferencesSection({ id: "prefs", label: "Anything", fieldKeys: ["notes"] })).toBe(true);
    expect(isDealPreferencesSection({ id: "household", label: "Preferences", fieldKeys: ["notes"] })).toBe(
      true,
    );
    expect(
      isDealPreferencesSection({
        id: "household",
        label: "Household",
        fieldKeys: ["nickname", "dependents"],
      }),
    ).toBe(true);
    expect(
      isDealPreferencesSection({
        id: "contact",
        label: "Contact",
        fieldKeys: ["first_name", "nickname"],
      }),
    ).toBe(false);
    expect(isDealPreferencesSection({ id: "intake", label: "Intake", fieldKeys: ["source"] })).toBe(false);
  });

  it("omits Preferences from every default deal layout", () => {
    for (const line of ["FLOOD", "WC", "UMBRELLA", "GL", "HEALTH", "HO", "BOP", "LIFE", "RV", "AUTO"]) {
      const layout = defaultLayoutForLine(line);
      const sections = layout.columns.flatMap((column) => column.sections);
      expect(sections.some((section) => isDealPreferencesSection(section))).toBe(false);
      const keys = allLayoutFieldKeys(layout);
      for (const key of CONTACT_PARITY_SECTION_FIELD_KEYS) {
        expect(keys).not.toContain(key);
      }
      expect(sections.map((section) => section.id)).toContain("intake");
      expect(sections.map((section) => section.id)).toContain("applicant");
      expect(sections.map((section) => section.id)).toContain("co_applicant");
    }
  });

  it("does not write Preferences back after the layout editor deletes it", () => {
    const saved = deleteSection(STALE_PREFERENCES, "prefs");
    expect(needsContactParityDealLayout(saved)).toBe(false);
    const reloaded = ensureContactParityDealLayout(saved);
    expect(reloaded).toBe(saved);
    expect(reloaded.columns.flatMap((column) => column.sections).map((section) => section.id)).not.toContain(
      "prefs",
    );
    expect(allLayoutFieldKeys(reloaded)).not.toContain("nickname");
    expect(allLayoutFieldKeys(reloaded)).toContain("referral");
  });

  it("does not refill preference keys inside a section the owner already trimmed", () => {
    const trimmed: FieldLayout = {
      columns: [
        { id: "left", sections: [{ id: "contact", label: "Contact", fieldKeys: ["first_name"] }] },
        {
          id: "right",
          sections: [
            { id: "prefs", label: "Preferences", fieldKeys: ["nickname"] },
            { id: "intake", label: "Intake", fieldKeys: ["source", "referral", "campaign_tag"] },
          ],
        },
      ],
    };
    expect(needsContactParityDealLayout(trimmed)).toBe(false);
    expect(ensureContactParityDealLayout(trimmed).columns[1].sections[0]?.fieldKeys).toEqual(["nickname"]);
  });

  it("hides a saved Preferences card on the deal detail page", () => {
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: STALE_PREFERENCES,
        fields: [],
        values: { nickname: "Ellie", dependents: "[]" },
      }),
    );
    expect(html).not.toMatch(/data-ff-deal-section="prefs"/);
    expect(html).not.toMatch(/>Preferences</);
    expect(html).not.toMatch(/data-ff-deal-field="nickname"/);
    expect(html).not.toMatch(/data-ff-deal-field="secondary_phone"/);
    expect(html).not.toMatch(/data-ff-deal-field="preferred_contact_method"/);
    expect(html).not.toMatch(/data-ff-deal-field="spouse_name"/);
    expect(html).not.toMatch(/data-ff-deal-field="spouse_link"/);
    expect(html).not.toMatch(/data-ff-deal-field="dependents"/);
    expect(html).toMatch(/data-ff-deal-section="contact"/);
    expect(html).toMatch(/data-ff-deal-section="applicant"/);
    expect(html).toMatch(/data-ff-deal-section="co_applicant"/);
    expect(html).toMatch(/data-ff-deal-section="intake"/);
    expect(layoutForActiveProduct(STALE_PREFERENCES, "homeowners").columns.flatMap((column) =>
      column.sections.map((section) => section.id),
    )).not.toContain("prefs");
  });

  it("hides a renamed section that is only the retired preference keys", () => {
    const renamed: FieldLayout = {
      ...STALE_PREFERENCES,
      columns: [
        STALE_PREFERENCES.columns[0],
        {
          id: "right",
          sections: [
            {
              id: "household",
              label: "Household",
              fieldKeys: ["nickname", "spouse_name", "dependents"],
            },
            { id: "intake", label: "Intake", fieldKeys: ["source", "referral"] },
          ],
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(DealDetailsPanel, {
        dealId: "deal-1",
        line: "HO",
        layout: renamed,
        fields: [],
        values: {},
      }),
    );
    expect(html).not.toMatch(/data-ff-deal-section="household"/);
    expect(html).not.toMatch(/>Household</);
    expect(html).not.toMatch(/data-ff-deal-field="nickname"/);
    expect(html).toMatch(/data-ff-deal-section="contact"/);
  });

  it("still renders Contact Preferences and leaves applicant fields alone", () => {
    const contact = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "contacts",
        layout: {
          columns: [
            {
              id: "left",
              sections: [{ id: "prefs", label: "Preferences", fieldKeys: ["nickname", "occupation"] }],
            },
            { id: "right", sections: [] },
          ],
        },
        fields: [],
        values: {},
      }),
    );
    expect(contact).toMatch(/data-ff-record-section="prefs"/);
    expect(contact).toMatch(/>Preferences</);

    const dealCreate = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "deals",
        layout: STALE_PREFERENCES,
        fields: [],
        values: {},
      }),
    );
    expect(dealCreate).not.toMatch(/data-ff-record-section="prefs"/);
    expect(dealCreate).not.toMatch(/>Preferences</);
    expect(dealCreate).toMatch(/data-ff-record-section="applicant"/);
  });
});
