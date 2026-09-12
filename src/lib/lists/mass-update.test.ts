import { describe, expect, it } from "vitest";
import {
  dealStagePatch,
  isManualBindStage,
  isMassUpdateColumn,
  massUpdateAppliesTo,
  massUpdateColumnsFromCatalog,
  massUpdateColumnsFromVisible,
  massUpdateSellingAgencyOptions,
  massUpdateStatusOptions,
  normalizeMassUpdateColumnId,
  selectAllMode,
} from "./mass-update";
import type { ListColumn } from "@/lib/list-columns";

describe("mass update", () => {
  it("keeps Bound off the deal status menu — bind is signature-only", () => {
    const values = massUpdateStatusOptions("deals").map((row) => row.value);
    expect(values).not.toContain("bound");
    expect(values).not.toContain("closed_won");
    expect(isManualBindStage("bound")).toBe(true);
    expect(dealStagePatch("quote_sent").pipelineStage).toBe("quote_sent");
  });

  it("select-all has visible-page and all-matching states", () => {
    const visible = ["a", "b"];
    const matching = ["a", "b", "c", "d"];
    expect(selectAllMode(visible, matching, [])).toBe("none");
    expect(selectAllMode(visible, matching, ["a"])).toBe("partial");
    expect(selectAllMode(visible, matching, ["a", "b"])).toBe("page");
    expect(selectAllMode(visible, matching, ["a", "b", "c", "d"])).toBe("matching");
  });

  it("offers the same fields on every CRM list", () => {
    expect(massUpdateAppliesTo("deals", "status")).toBe(true);
    expect(massUpdateAppliesTo("leads", "follow_up_template")).toBe(true);
    expect(massUpdateAppliesTo("contacts", "source")).toBe(true);
    expect(massUpdateAppliesTo("policies", "owner")).toBe(true);
    expect(massUpdateAppliesTo("deals", "custom")).toBe(true);
  });

  it("offers client statuses for contacts and businesses; Active/Inactive for carriers", () => {
    expect(massUpdateStatusOptions("contacts").map((row) => row.value)).toEqual([
      "client",
      "former_client",
      "not_a_client",
    ]);
    expect(massUpdateStatusOptions("businesses").map((row) => row.value)).toEqual([
      "client",
      "former_client",
      "not_a_client",
    ]);
    expect(massUpdateStatusOptions("carriers").map((row) => row.value)).toEqual(["Active", "Inactive"]);
  });
});

describe("mass update matches available list columns (catalog)", () => {
  const dealsColumns: ListColumn[] = [
    { id: "pick", label: "", locked: true },
    { id: "title", label: "Deal", locked: true },
    { id: "stage", label: "Stage", locked: true },
    { id: "source", label: "Source" },
    { id: "assigned", label: "Assigned" },
    { id: "tags", label: "Tags", locked: true },
    { id: "selling_agency", label: "Selling Agency", defaultOn: false },
    { id: "notes", label: "Notes", defaultOn: false },
    { id: "updated", label: "Updated", defaultOn: false },
  ];

  it("Mass Update fields = all catalog columns minus pick/title/tags/updated", () => {
    const fields = massUpdateColumnsFromCatalog(dealsColumns);
    expect(fields.map((field) => field.id)).toEqual([
      "stage",
      "source",
      "assigned",
      "selling_agency",
      "notes",
    ]);
    expect(fields.map((field) => field.label)).toContain("Selling Agency");
  });

  it("when a column is added to / removed from the catalog, Mass Update options change — not gated on visible", () => {
    const withAgency = massUpdateColumnsFromCatalog(dealsColumns);
    const withoutAgency = massUpdateColumnsFromCatalog(
      dealsColumns.filter((column) => column.id !== "selling_agency"),
    );
    expect(withAgency.some((field) => field.id === "selling_agency")).toBe(true);
    expect(withoutAgency.some((field) => field.id === "selling_agency")).toBe(false);
    // Visibility alone does not remove catalog options
    const visibleOnlyStage = massUpdateColumnsFromVisible(dealsColumns, ["pick", "title", "stage"]);
    expect(visibleOnlyStage.map((field) => field.id)).toEqual(["stage"]);
    const fullCatalog = massUpdateColumnsFromCatalog(dealsColumns);
    expect(fullCatalog.map((field) => field.id)).toContain("notes");
    expect(fullCatalog.map((field) => field.id)).toContain("selling_agency");
  });

  it("includes defaultOn:false catalog columns (hidden-but-available)", () => {
    const fields = massUpdateColumnsFromCatalog(dealsColumns);
    expect(fields.some((field) => field.id === "notes")).toBe(true);
    expect(fields.some((field) => field.id === "selling_agency")).toBe(true);
    expect(fields.some((field) => field.id === "source")).toBe(true);
  });

  it("stage stays mass-editable when it is a locked catalog column", () => {
    expect(isMassUpdateColumn({ id: "stage", label: "Stage" })).toBe(true);
    expect(isMassUpdateColumn({ id: "title", label: "Deal" })).toBe(false);
    expect(isMassUpdateColumn({ id: "pick", label: "" })).toBe(false);
    expect(isMassUpdateColumn({ id: "tags", label: "Tags" })).toBe(false);
    expect(isMassUpdateColumn({ id: "linkedContacts", label: "Linked Contacts" })).toBe(false);
    expect(isMassUpdateColumn({ id: "lifetime", label: "Lifetime" })).toBe(false);
    expect(isMassUpdateColumn({ id: "party", label: "Party" })).toBe(false);
  });

  it("maps legacy owner/status onto deal column ids and offers Selling Agency picklist", () => {
    expect(normalizeMassUpdateColumnId("owner", "deals")).toBe("assigned");
    expect(normalizeMassUpdateColumnId("status", "deals")).toBe("stage");
    expect(massUpdateSellingAgencyOptions().map((row) => row.value)).toContain("AFA");
  });

  it("applies the same catalog filter on Leads Mass Update", () => {
    const leadsColumns: ListColumn[] = [
      { id: "pick", label: "", locked: true },
      { id: "name", label: "Name", locked: true },
      { id: "status", label: "Status", locked: true },
      { id: "source", label: "Source" },
      { id: "timer", label: "Response", locked: true },
      { id: "notes", label: "Notes", defaultOn: false },
      { id: "tags", label: "Tags", locked: true },
    ];
    const fields = massUpdateColumnsFromCatalog(leadsColumns);
    expect(fields.map((field) => field.id)).toEqual(["status", "source", "notes"]);
  });

  it("Contacts catalog includes defaultOn:false layout extras in Mass Update", () => {
    const contactsColumns: ListColumn[] = [
      { id: "pick", label: "", locked: true },
      { id: "name", label: "Name", locked: true },
      { id: "phone", label: "Phone" },
      { id: "email", label: "Email" },
      { id: "status", label: "Client Status" },
      { id: "lifetime", label: "Lifetime Deals" },
      { id: "inForce", label: "In-Force" },
      { id: "tags", label: "Tags" },
      { id: "lastActivity", label: "Last Activity" },
      { id: "mailing_address", label: "Address", defaultOn: false },
      { id: "city", label: "City", defaultOn: false },
      { id: "source", label: "Source", defaultOn: false },
      { id: "notes", label: "Notes", defaultOn: false },
    ];
    const fields = massUpdateColumnsFromCatalog(contactsColumns);
    expect(fields.map((field) => field.id)).toEqual([
      "phone",
      "email",
      "status",
      "mailing_address",
      "city",
      "source",
      "notes",
    ]);
    expect(fields.some((field) => field.id === "lifetime")).toBe(false);
    expect(fields.some((field) => field.id === "lastActivity")).toBe(false);
  });

  it("Businesses catalog includes defaultOn:false layout field and excludes computed columns", () => {
    const businessesColumns: ListColumn[] = [
      { id: "pick", label: "", locked: true },
      { id: "business", label: "Business Name", locked: true },
      { id: "status", label: "Status" },
      { id: "industry", label: "Industry" },
      { id: "source", label: "Source" },
      { id: "linkedContacts", label: "Linked Contacts" },
      { id: "policies", label: "Policies" },
      { id: "lastActivity", label: "Last Activity" },
      { id: "website", label: "Website", defaultOn: false },
      { id: "phone", label: "Phone", defaultOn: false },
    ];
    const fields = massUpdateColumnsFromCatalog(businessesColumns);
    expect(fields.map((field) => field.id)).toEqual([
      "status",
      "industry",
      "source",
      "website",
      "phone",
    ]);
    expect(fields.some((field) => field.id === "linkedContacts")).toBe(false);
    expect(fields.some((field) => field.id === "policies")).toBe(false);
  });
});
