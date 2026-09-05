import { describe, expect, it } from "vitest";
import { moduleFromFilename, parseZohoJsonl } from "./jsonl";
import { mapContact, mapDeal, mapDealStage, mapPolicy, mapVendor } from "./maps";
import { KEEP_TABLES, WIPE_ROOT_TABLES, planWipe } from "./wipe";
import { normalizeCarrierName } from "./values";

describe("Zoho JSONL dump layout", () => {
  it("reads a getRecords page and a bare record line", () => {
    const text = [
      JSON.stringify({
        data: [{ id: "1", First_Name: "Sharon", Last_Name: "Reese" }],
        info: { count: 1, more_records: true },
      }),
      JSON.stringify({ id: "2", First_Name: "Flavia", Last_Name: "Diaz" }),
    ].join("\n");
    const rows = parseZohoJsonl(text);
    expect(rows.map((row) => row.Last_Name)).toEqual(["Reese", "Diaz"]);
  });

  it("reads a whole JSON array dump", () => {
    const rows = parseZohoJsonl(JSON.stringify([{ id: "9", Vendor_Name: "Coterie" }]));
    expect(rows[0]?.Vendor_Name).toBe("Coterie");
  });

  it("maps dump filenames to modules", () => {
    expect(moduleFromFilename("Contacts.jsonl")).toBe("Contacts");
    expect(moduleFromFilename("zoho-accounts.json")).toBe("Accounts");
    expect(moduleFromFilename("businesses.jsonl")).toBe("Accounts");
    expect(moduleFromFilename("Vendors.jsonl")).toBe("Vendors");
    expect(moduleFromFilename("notes.jsonl")).toBeNull();
  });
});

describe("Zoho field maps", () => {
  it("maps a live-shaped contact and reports unmatched household fields", () => {
    const mapped = mapContact(
      {
        id: "6742853000011057053",
        First_Name: "Sharon",
        Last_Name: "Reese",
        Email: "Sharon@gmail.com",
        Mobile: "321-245-1780",
        Date_of_Birth: "1962-07-19",
        Spouse: { id: "x", name: "Partner" },
      },
      "6742853000011057053",
    );
    expect(mapped.email).toBe("Sharon@gmail.com");
    expect(mapped.phone).toBe("321-245-1780");
    expect(mapped.dateOfBirth).toBe("1962-07-19");
    expect(mapped.unmatched).toContain("Spouse");
    expect(mapped.owner.email).toBeNull();
  });

  it("extracts Zoho Owner without listing it as unmatched", () => {
    const mapped = mapContact(
      {
        id: "c1",
        First_Name: "Mario",
        Last_Name: "Garcia",
        Owner: { name: "Maya Chen", id: "z-maya", email: "maya@fitfirst.local" },
      },
      "c1",
    );
    expect(mapped.owner).toEqual({
      zohoId: "z-maya",
      name: "Maya Chen",
      email: "maya@fitfirst.local",
    });
    expect(mapped.unmatched).not.toContain("Owner");
  });

  it("links deals to contact/business lookups and maps stages", () => {
    expect(mapDealStage("Quote Sent")).toBe("quote_sent");
    expect(mapDealStage("Closed Won")).toBe("closed_won");
    const mapped = mapDeal(
      {
        Deal_Name: "Sharon Reese",
        Stage: "New Lead",
        Pipeline: "P - C",
        Contact_Name: { name: "Sharon Reese", id: "6742853000011057053" },
        Account_Name: null,
        Year_Built: 1998,
      },
      "d1",
    );
    expect(mapped.contactZohoId).toBe("6742853000011057053");
    expect(mapped.pipelineStage).toBe("shopping");
    expect(mapped.unmatched).toContain("Year_Built");
  });

  it("maps a custom Policies record including carrier lookup", () => {
    const mapped = mapPolicy(
      {
        Policy_Number: "CSG-00544929-00",
        Status: "Active",
        Policy_Sub_Type: "General Liability",
        Policy_Type: "Commercial",
        Effective_Date: "2026-08-29",
        Policy_Term: "12 Months",
        Gross_Written_Premium: 359,
        Contact: { name: "Natasha Logan", id: "6742853000009315158" },
        Business: { name: "E-Pac Business Center", id: "6742853000010666008" },
        Writing_Carrier: { name: "Coterie", id: "6742853000010557766" },
      },
      "p1",
    );
    if ("skip" in mapped) throw new Error(mapped.skip);
    expect(mapped.lineOfBusiness).toBe("GL");
    expect(mapped.contactZohoId).toBe("6742853000009315158");
    expect(mapped.accountZohoId).toBe("6742853000010666008");
    expect(mapped.carrierName).toBe("Coterie");
    expect(mapped.expirationDate.toISOString().startsWith("2027-08-29")).toBe(true);
  });

  it("does not treat a same-name vendor as a new carrier key", () => {
    const mapped = mapVendor({ Vendor_Name: "Tailrow Specialty Ins.", Written_Lines: ["HO"] }, "v1");
    expect(normalizeCarrierName(mapped.name)).toBe(normalizeCarrierName("Tailrow Specialty"));
  });
});

describe("CRM wipe keep-list", () => {
  it("never deletes users, tenant, or carriers", () => {
    expect(KEEP_TABLES.has("users")).toBe(true);
    expect(KEEP_TABLES.has("tenants")).toBe(true);
    expect(KEEP_TABLES.has("carriers")).toBe(true);
    expect(KEEP_TABLES.has("carrier_appointments")).toBe(true);
    expect(WIPE_ROOT_TABLES).toEqual(
      expect.arrayContaining(["leads", "deals", "contacts", "accounts", "policies", "quotes", "alerts", "activities"]),
    );
  });

  it("deletes children before roots and nulls FKs on kept tables", () => {
    const plan = planWipe([
      {
        table_name: "quotes",
        column_name: "deal_id",
        foreign_table_name: "deals",
        foreign_column_name: "id",
        is_nullable: "NO",
      },
      {
        table_name: "quotes",
        column_name: "carrier_id",
        foreign_table_name: "carriers",
        foreign_column_name: "id",
        is_nullable: "NO",
      },
      {
        table_name: "fill_learning_logs",
        column_name: "deal_id",
        foreign_table_name: "deals",
        foreign_column_name: "id",
        is_nullable: "YES",
      },
      {
        table_name: "appetite_rules",
        column_name: "carrier_id",
        foreign_table_name: "carriers",
        foreign_column_name: "id",
        is_nullable: "YES",
      },
    ]);
    expect(plan.full.indexOf("quotes")).toBeLessThan(plan.full.indexOf("deals"));
    expect(plan.partial.some((row) => row.table === "fill_learning_logs")).toBe(true);
    expect(plan.nullOut.some((row) => row.table === "appetite_rules")).toBe(false);
    expect(KEEP_TABLES.has("appetite_rules")).toBe(true);
  });
});
