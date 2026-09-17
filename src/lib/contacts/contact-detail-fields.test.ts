import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactCoverageRecord } from "@/components/contacts/contact-coverage-record";
import { ContactDetailField } from "@/components/contacts/contact-detail-field";
import { RecordLayoutFields } from "@/components/custom-fields/record-layout-form";
import { contactCardLayout } from "./contact-field-catalog";

describe("contact detail field system", () => {
  it("renders a label|value cell so the value carries the row", () => {
    const html = renderToStaticMarkup(
      createElement(
        ContactDetailField,
        { fieldKey: "first_name", label: "First Name" },
        createElement("span", null, "Rosa"),
      ),
    );
    expect(html).toMatch(/data-ff-contact-field="first_name"/);
    expect(html).toMatch(/uppercase/);
    expect(html).toMatch(/text-muted-foreground/);
    expect(html).toMatch(/Rosa/);
    expect(html).toMatch(/grid-cols-\[6\.75rem_minmax\(0,1fr\)\]/);
  });

  it("uses the same compact cells across the five Contact Details sections", () => {
    const html = renderToStaticMarkup(
      createElement(RecordLayoutFields, {
        module: "contacts",
        layout: contactCardLayout(),
        fields: [
          { key: "first_name", label: "First Name", type: "single_line" },
          { key: "last_name", label: "Last Name", type: "single_line" },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone", type: "phone" },
          { key: "date_of_birth", label: "Date Of Birth", type: "dob" },
          { key: "marital_status", label: "Marital Status", type: "picklist", options: ["Married"] },
          { key: "mailing_address", label: "Address", type: "address" },
          { key: "city", label: "City", type: "single_line" },
          { key: "state", label: "State", type: "single_line" },
          { key: "zip", label: "ZIP", type: "single_line" },
          { key: "occupation", label: "Occupation", type: "picklist", options: [] },
          { key: "education_level", label: "Education Level", type: "picklist", options: [] },
          { key: "preferred_contact_method", label: "Preferred Contact Method", type: "picklist", options: [] },
          { key: "preferred_contact_time", label: "Preferred Contact Time", type: "picklist", options: [] },
          { key: "existing_coverage_types", label: "Existing Coverage Type", type: "multi_select", options: [] },
          { key: "is_homeowner", label: "Homeowner", type: "checkbox" },
          { key: "is_business_owner", label: "Business Owner", type: "checkbox" },
          { key: "recent_life_events", label: "Recent Life Events", type: "multi_select", options: [] },
          { key: "cross_selling_opportunity", label: "Cross-Selling Opportunity", type: "picklist", options: [] },
          { key: "source", label: "Lead Source", type: "picklist", options: [] },
          { key: "referral", label: "Referred By", type: "single_line" },
        ],
        values: { first_name: "Rosa", last_name: "Castellanos" },
      }),
    );
    expect(html).toMatch(/data-ff-contact-section="identity"/);
    expect(html).toMatch(/data-ff-contact-section="prefs"/);
    expect(html).toMatch(/data-ff-contact-section="coverage"/);
    expect(html).toMatch(/data-ff-contact-section="opportunities"/);
    expect(html).toMatch(/data-ff-contact-section="intake"/);
    expect(html).toMatch(/data-ff-contact-field="first_name"/);
    expect(html).toMatch(/data-ff-contact-field="source"/);
    expect(html).toMatch(/data-ff-contact-coverage-record/);
    expect(html).toMatch(/data-ff-compact-row/);
    expect(html).not.toMatch(/text-center text-lg font-semibold/);
  });

  it("shows with-us / another-carrier / not-covered for household lines", () => {
    const html = renderToStaticMarkup(
      createElement(ContactCoverageRecord, {
        existingTypes: "HO3",
        carrierMapRaw: JSON.stringify({ HO: "other" }),
        inForceLines: ["AUTO"],
      }),
    );
    expect(html).toMatch(/data-ff-coverage-record-line="HO"/);
    expect(html).toMatch(/data-ff-coverage-record-line="AUTO"/);
    expect(html).toMatch(/Another carrier/);
    expect(html).toMatch(/On the book/);
    expect(html).toMatch(/not a missing-line gap/);
  });
});
