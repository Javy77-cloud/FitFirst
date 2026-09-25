import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONTACT_EDUCATION_OPTIONS,
  CONTACT_EXTERNAL_COVERAGE_LABEL,
  CONTACT_GENERATED_OPPORTUNITIES_LABEL,
  CONTACT_MODULE_FIELDS,
  contactCardLayout,
  rebalanceContactDetailLayout,
  splitCoverageOpportunitiesLayout,
} from "./contact-field-catalog";
import { defaultFieldsForModule, defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { CONTACTS_LIST_COLUMNS } from "@/lib/list-columns";
import { OCCUPATION_PICKLIST_NAME } from "./occupation-picklist";
import {
  STARTER_FIELD_PICKLISTS,
  STARTER_PICKLIST_OCCUPATIONS,
  STARTER_PICKLIST_SEED_KEY,
} from "@/lib/custom-fields/starter-picklists";
import { buildPolicyCoApplicantLinks, policyCoApplicantLabel } from "./policy-co-applicants";

describe("Contacts module v1 standards", () => {
  it("list has New Contact popup and no side Add form", () => {
    const page = readFileSync("src/app/contacts/page.tsx", "utf8");
    expect(page).toMatch(/AddContactDialog/);
    expect(page).toMatch(/data-ff-contacts-list-actions/);
    expect(page).not.toMatch(/data-ff-contacts-list=/);
    expect(page).not.toMatch(/data-ff-healthsherpa-review-banner/);
    expect(page).toMatch(/BookKpiStrip[\s\S]*flat/);
    expect(page).toMatch(/banner=\{null\}/);
    expect(page).toMatch(/hideSelectionCue/);
    expect(page.indexOf("afterCheck={<PipelineFilterSearch />}")).toBeLessThan(
      page.indexOf("afterActions={<PipelineFilterControls />}"),
    );
    expect(page.indexOf("afterActions={<PipelineFilterControls />}")).toBeLessThan(
      page.indexOf("data-ff-contacts-list-actions"),
    );
    expect(page).not.toMatch(/Add contact/);
    expect(page).not.toMatch(/lg:grid-cols-\[320px/);
    expect(page).toMatch(/BookCommandWorkspace/);
    expect(page).toMatch(/layout="stack"/);
    expect(page).not.toMatch(/DeskColumnTable/);
  });

  it("new contact uses live layout + existing-contact guard", () => {
    const page = readFileSync("src/app/contacts/new/page.tsx", "utf8");
    expect(page).toMatch(/RecordLayoutFields/);
    expect(page).toMatch(/loadModuleLayoutBundle\("contacts"/);
    expect(page).toMatch(/LinkExistingContactGuard/);
    expect(page).toMatch(/module="contacts"/);
    expect(page).toMatch(/Save Contact/);
  });

  it("detail redesign: no header quick actions, no Contact co-app UI, rail kept", () => {
    const page = readFileSync("src/app/contacts/[id]/page.tsx", "utf8");
    expect(page).toMatch(/ContactDetailWorkspace/);
    expect(page).toMatch(/RecordLayoutForm/);
    expect(page).toMatch(/ContactTimelineSection/);
    expect(page).toMatch(/ContactOverflowMenu/);
    expect(page).toMatch(/ClientStatusDot/);
    expect(page).not.toMatch(/ContactQuickActions/);
    expect(page).not.toMatch(/contact-quick-actions/);
    expect(page).toMatch(/LinkedBusinessLine/);
    expect(page).toMatch(/ContactDetailSections/);
    expect(page).toMatch(/title="Contacts"/);
    expect(page).toMatch(/ContactPolicyRows/);
    expect(page).toMatch(/ContactDealRows/);
    expect(page).toMatch(/ContactAtAGlanceCards/);
    expect(page).toMatch(/data-ff-contact-book-glance/);
    expect(page).toMatch(/QuickCommsBoard/);
    expect(page).toMatch(/listRecordActivities\(\{ contactId/);
    expect(page).toMatch(/RecordContextRail/);
    expect(page).toMatch(/defaultTab="info"/);
    expect(page).not.toMatch(/defaultTab="conversations"/);
    expect(page).not.toMatch(/ff-contact-rail-meta/);
    expect(readFileSync("src/components/contacts/contact-at-a-glance-cards.tsx", "utf8")).toMatch(
      /data-ff-glance-comms="status"/,
    );
    expect(page).toMatch(/loadModuleLayoutBundle\("contacts"/);
    expect(page).toMatch(/buildPolicyCoApplicantLinks/);
    expect(page).toMatch(/coApplicantLinks/);
    expect(page).not.toMatch(/CoApplicantSection/);
    expect(page).not.toMatch(/data-ff-header-coapplicant/);
    expect(page).toMatch(/Save Contact/);
    expect(page).toMatch(/clickToEdit/);
    expect(page).toMatch(/EditLayoutLink/);
    expect(page).not.toMatch(/contact-locations/);
    expect(page).not.toMatch(/LocationsList/);
    expect(page).not.toMatch(/\bRecordTags\b/);
    expect(page).not.toMatch(/RecordComms/);
    expect(page).not.toMatch(/Email \/ SMS Queue/);
    expect(page).not.toMatch(/RecordDetailLayout/);
  });

  it("wires full contact field catalog + occupation as picklist", () => {
    expect(defaultFieldsForModule("contacts")).toBe(CONTACT_MODULE_FIELDS);
    expect(defaultLayoutForModule("contacts")).toEqual(contactCardLayout());
    const sections = contactCardLayout().columns.flatMap((column) => column.sections);
    // Coverage / Opportunities are page tabs — not inside Contact Details layout.
    expect(sections.map((section) => section.id)).toEqual(["identity", "prefs", "intake"]);
    expect(sections.find((section) => section.label === "Coverage & Opportunities")).toBeUndefined();
    expect(contactCardLayout().columns[0].sections.map((section) => section.id)).toEqual([
      "identity",
      "prefs",
      "intake",
    ]);
    expect(sections.find((section) => section.id === "identity")?.fieldKeys).toEqual(
      expect.arrayContaining([
        "first_name",
        "middle_name",
        "last_name",
        "nickname",
        "date_of_birth",
        "phone",
        "secondary_phone",
        "email",
        "mailing_address",
        "city",
        "state",
        "zip",
        "dl_state",
        "drivers_license_number",
        "dl_expiration",
      ]),
    );
    expect(sections.find((section) => section.id === "identity")?.fieldKeys).not.toContain(
      "education_level",
    );
    expect(sections.find((section) => section.id === "prefs")?.fieldKeys).toEqual(
      expect.arrayContaining([
        "preferred_language",
        "marital_status",
        "occupation",
        "gender",
        "spouse_name",
        "dependents",
      ]),
    );
    expect(sections.find((section) => section.id === "prefs")?.fieldKeys).not.toContain(
      "education_level",
    );
    expect(CONTACT_MODULE_FIELDS.find((field) => field.key === "existing_coverage_types")?.label).toBe(
      CONTACT_EXTERNAL_COVERAGE_LABEL,
    );
    expect(CONTACT_MODULE_FIELDS.find((field) => field.key === "cross_selling_opportunity")).toEqual(
      expect.objectContaining({
        label: CONTACT_GENERATED_OPPORTUNITIES_LABEL,
        type: "single_line",
      }),
    );
    const occupation = CONTACT_MODULE_FIELDS.find((f) => f.key === "occupation");
    expect(occupation?.type).toBe("picklist");
    const education = CONTACT_MODULE_FIELDS.find((f) => f.key === "education_level");
    expect(education?.options).toEqual([...CONTACT_EDUCATION_OPTIONS]);
    expect(CONTACT_EDUCATION_OPTIONS.indexOf("Associate's")).toBeLessThan(
      CONTACT_EDUCATION_OPTIONS.indexOf("Bachelor's"),
    );
    expect(
      STARTER_FIELD_PICKLISTS.find((list) => list.seedKey === STARTER_PICKLIST_SEED_KEY.education)
        ?.options,
    ).toEqual([...CONTACT_EDUCATION_OPTIONS]);
    expect(CONTACT_MODULE_FIELDS.some((f) => f.key === "pc_notes")).toBe(true);
    const combined = {
      columns: [
        { id: "left", sections: [] },
        {
          id: "right",
          sections: [
            {
              id: "opportunities",
              label: "Coverage & Opportunities",
              fieldKeys: [
                "recent_life_events",
                "existing_coverage_types",
                "cross_selling_opportunity",
                "is_homeowner",
                "is_business_owner",
              ],
            },
          ],
        },
      ],
    } as ReturnType<typeof contactCardLayout>;
    const split = splitCoverageOpportunitiesLayout(combined);
    expect(split.columns[1].sections.map((section) => section.id)).toEqual([
      "coverage",
      "opportunities",
    ]);
    const stackedPrefs = {
      columns: [
        {
          id: "left",
          sections: [
            {
              id: "identity",
              label: "Contact",
              fieldKeys: [
                "first_name",
                "last_name",
                "email",
                "phone",
                "date_of_birth",
                "mailing_address",
                "city",
                "state",
                "zip",
                "marital_status",
              ],
            },
          ],
        },
        {
          id: "right",
          sections: [
            { id: "prefs", label: "Preferences", fieldKeys: ["occupation"] },
            { id: "coverage", label: "Coverage", fieldKeys: ["existing_coverage_types"] },
          ],
        },
      ],
    } as ReturnType<typeof contactCardLayout>;
    const rebalanced = rebalanceContactDetailLayout(stackedPrefs);
    expect(rebalanced.columns[0].sections.map((section) => section.id)).toEqual([
      "identity",
      "prefs",
    ]);
    expect(rebalanced.columns[0].sections[0]?.fieldKeys).toContain("marital_status");
    expect(rebalanced.columns[0].sections[0]?.fieldKeys.indexOf("marital_status")).toBeLessThan(
      rebalanced.columns[0].sections[0]!.fieldKeys.indexOf("mailing_address"),
    );
  });

  it("list columns include phone email tags last activity", () => {
    const ids = CONTACTS_LIST_COLUMNS.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining(["phone", "email", "tags", "lastActivity", "lifetime", "inForce", "status"]),
    );
  });

  it("occupation picklist is global shared settings list", () => {
    expect(OCCUPATION_PICKLIST_NAME).toBe("Occupations");
    expect(STARTER_PICKLIST_OCCUPATIONS).toBe("Occupations");
    const starter = readFileSync("src/lib/custom-fields/starter-picklists.ts", "utf8");
    expect(starter).toMatch(/STARTER_PICKLIST_OCCUPATIONS/);
    expect(starter).toMatch(/STARTER_PICKLIST_RECENT_LIFE_EVENTS/);
    expect(starter).toMatch(/STARTER_PICKLIST_POLICY_SUBTYPES/);
  });

  it("policy co-applicant reverse lookup labels", () => {
    expect(policyCoApplicantLabel("co-applied-with")).toBe("Co-Applied With:");
    expect(policyCoApplicantLabel("co-applies-with")).toBe("Co-Applies With:");
    const withPolicies = buildPolicyCoApplicantLinks({
      contactId: "a",
      linkedContacts: [{ id: "b", firstName: "Maria", lastName: "Lopez" }],
      ownsPolicies: true,
    });
    expect(withPolicies[0]?.relation).toBe("co-applied-with");
    const asCo = buildPolicyCoApplicantLinks({
      contactId: "a",
      linkedContacts: [{ id: "b", firstName: "Maria", lastName: "Lopez" }],
      ownsPolicies: false,
    });
    expect(asCo[0]?.relation).toBe("co-applies-with");
  });

  it("workspace keeps 320px rail on the right (never stacks under fields)", () => {
    const ws = readFileSync("src/components/contacts/contact-detail-workspace.tsx", "utf8");
    expect(ws).toMatch(/gap-x-6/);
    expect(ws).toMatch(/ACTIVITY_RAIL_COLUMNS/);
    expect(ws).toMatch(/data-ff-deal-right-rail/);
    // Outer rail grid must not use responsive stacking; top chip nav lives in main column only.
    expect(ws).not.toMatch(/lg:grid-cols-/);
    expect(ws).not.toMatch(/data-ff-contact-left-nav-slot/);
    expect(ws).not.toMatch(/180px_minmax\(0,1fr\)/);
    expect(ws).not.toMatch(/md:\[grid-template-columns:180px/);
    expect(ws).toMatch(/data-ff-contact-top-nav-slot/);
  });

  it("true swapping tabs via ?tab=; sticky chip nav; co-app section absent", () => {
    const page = readFileSync("src/app/contacts/[id]/page.tsx", "utf8");
    const nav = readFileSync("src/components/contact-section-nav.tsx", "utf8");
    const sections = readFileSync("src/lib/desk/contact-sections.ts", "utf8");
    const tabs = readFileSync("src/lib/desk/contact-tabs.ts", "utf8");
    expect(page).toMatch(/ContactDetailSections/);
    expect(page).toMatch(/parseContactTab/);
    expect(page).toMatch(/activeTab=\{activeTab\}/);
    expect(page).toMatch(/basePath=\{`\/contacts\/\$\{contact\.id\}`\}/);
    expect(page).toMatch(/id: "at-a-glance"/);
    expect(page).toMatch(/id: "contact-details"/);
    expect(page).toMatch(/id: "coverage"/);
    expect(page).toMatch(/id: "opportunities"/);
    expect(page).toMatch(/id: "policies"/);
    expect(page).toMatch(/id: "deals"/);
    expect(page).toMatch(/ContactCoveragePanel/);
    expect(page).toMatch(/ContactOpportunitiesPanel/);
    expect(page).not.toMatch(/scheduleContactCoverageNotices/);
    expect(page).not.toMatch(/syncContactCoverageNotices/);
    expect(page).toMatch(/id: "timeline"/);
    expect(page).toMatch(/id: "emails"/);
    expect(page).toMatch(/id: "sms"/);
    expect(page).toMatch(/id: "meetings"/);
    expect(page).toMatch(/id: "documents"/);
    expect(page).toMatch(/id: "notes"/);
    expect(page).not.toMatch(/RecordModuleMacros/);
    expect(page).toMatch(/endSlot=/);
    expect(page).toMatch(/RecordListPager/);
    expect(page).toMatch(/module="contacts"/);
    expect(page).toMatch(/ContactOverflowMenu/);
    expect(page).not.toMatch(/ml-auto shrink-0[\s\S]{0,80}ContactOverflowMenu/);
    expect(readFileSync("src/components/comms/quick-comms-board.tsx", "utf8")).toMatch(
      /contactId\s*\?[\s\S]*?"contact"/,
    );
    const timeline = readFileSync("src/components/contacts/contact-timeline-section.tsx", "utf8");
    const panels = readFileSync("src/components/contacts/contact-detail-sections.tsx", "utf8");
    const shell = readFileSync("src/components/records/record-tab-shell.tsx", "utf8");
    expect(page).toMatch(/id="contact-details"/);
    expect(panels).toMatch(/RecordTabShell/);
    expect(panels).toMatch(/mode="tabs"/);
    expect(shell).toMatch(/data-ff-record-tab-shell/);
    expect(tabs).toMatch(/parseContactTab/);
    expect(timeline).toMatch(/data-ff-contact-timeline/);
    expect(page).toMatch(/title="Contacts"/);
    expect(page).toMatch(/ContactDetailSections/);
    expect(page).toMatch(/text-xl font-semibold text-navy/);
    expect(page).not.toMatch(/CoApplicantSection/);
    expect(page).not.toMatch(/data-ff="contact-coapplicants"/);
    expect(page).not.toMatch(/ContactQuickActions/);
    expect(nav).toMatch(/data-ff-contact-section-nav="top"/);
    expect(nav).toMatch(/mode\?: "tabs" \| "scroll"/);
    expect(nav).toMatch(/\?tab=/);
    expect(nav).toMatch(/fixed/);
    expect(nav).toMatch(/pinned/);
    expect(nav).toMatch(/chipTabClass/);
    expect(nav).toMatch(/FF_CHIP_TAB_GROUP/);
    expect(nav).toMatch(/CONTACT_SECTION_NAV_MAX/);
    expect(nav).toMatch(/Edit Nav/);
    expect(nav).toMatch(/Customize/);
    expect(nav).toMatch(/data-ff-contact-nav-selected/);
    expect(nav).toMatch(/data-ff-contact-nav-available/);
    expect(nav).toMatch(/Reset/);
    expect(sections).toMatch(/CONTACT_SECTION_NAV_MAX = 12/);
    expect(sections).toMatch(/DEFAULT_CONTACT_SECTION_NAV_IDS/);
    expect(sections).toMatch(/id: "coverage"/);
    expect(sections).toMatch(/id: "opportunities"/);
  });
});
