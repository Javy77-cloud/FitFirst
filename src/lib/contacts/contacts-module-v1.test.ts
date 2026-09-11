import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTACT_MODULE_FIELDS, contactCardLayout } from "./contact-field-catalog";
import { defaultFieldsForModule, defaultLayoutForModule } from "@/lib/custom-fields/modules";
import { CONTACTS_LIST_COLUMNS } from "@/lib/list-columns";

describe("Contacts module v1 standards", () => {
  it("list has New Contact popup and no side Add form", () => {
    const page = readFileSync("src/app/contacts/page.tsx", "utf8");
    expect(page).toMatch(/AddContactDialog/);
    expect(page).toMatch(/data-ff-contacts-list-actions/);
    expect(page).not.toMatch(/Add contact/);
    expect(page).not.toMatch(/lg:grid-cols-\[320px/);
    expect(page).toMatch(/lastActivity/);
    expect(page).toMatch(/defaultSort=\{\{ key: "lastActivity", dir: "desc" \}\}/);
  });

  it("new contact uses live layout + existing-contact guard", () => {
    const page = readFileSync("src/app/contacts/new/page.tsx", "utf8");
    expect(page).toMatch(/RecordLayoutFields/);
    expect(page).toMatch(/loadModuleLayoutBundle\("contacts"/);
    expect(page).toMatch(/LinkExistingContactGuard/);
    expect(page).toMatch(/module="contacts"/);
    expect(page).toMatch(/Save Contact/);
  });

  it("detail uses 420px rail workspace without Email/SMS Queue", () => {
    const page = readFileSync("src/app/contacts/[id]/page.tsx", "utf8");
    expect(page).toMatch(/ContactDetailWorkspace/);
    expect(page).toMatch(/Save Contact/);
    expect(page).toMatch(/data-ff-contact-policies/);
    expect(page).toMatch(/data-ff-contact-deals/);
    expect(page).toMatch(/data-ff-contact-timeline/);
    expect(page).toMatch(/ContactQuickActions/);
    expect(page).toMatch(/ContactOverflowMenu/);
    expect(page).toMatch(/ContactHealthBadge/);
    expect(page).toMatch(/CoApplicantSection/);
    expect(page).toMatch(/LinkedBusinessLine/);
    expect(page).toMatch(/CollapsibleSection/);
    expect(page).not.toMatch(/RecordComms/);
    expect(page).not.toMatch(/Email \/ SMS Queue/);
    expect(page).not.toMatch(/RecordDetailLayout/);
  });

  it("wires full contact field catalog", () => {
    expect(defaultFieldsForModule("contacts")).toBe(CONTACT_MODULE_FIELDS);
    expect(defaultLayoutForModule("contacts")).toEqual(contactCardLayout());
    expect(CONTACT_MODULE_FIELDS.some((f) => f.key === "occupation")).toBe(true);
    expect(CONTACT_MODULE_FIELDS.some((f) => f.key === "pc_notes")).toBe(true);
  });

  it("list columns include phone email tags last activity", () => {
    const ids = CONTACTS_LIST_COLUMNS.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining(["phone", "email", "tags", "lastActivity", "lifetime", "inForce", "status"]),
    );
  });
});
