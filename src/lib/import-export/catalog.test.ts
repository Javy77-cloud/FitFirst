import { describe, expect, it } from "vitest";
import { ENTITY_PACKS, canImport, packFor, templateCsv } from "./catalog";

describe("import-export catalog", () => {
  it("covers the portable CRM/AMS pack and labels Contacts vs Accounts", () => {
    const keys = ENTITY_PACKS.map((pack) => pack.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "leads",
        "contacts",
        "businesses",
        "deals",
        "policies",
        "carriers",
        "activities",
        "notes",
        "documents",
        "commissions",
        "quotes",
        "users",
        "pipelines",
        "appetite",
        "declines",
      ]),
    );
    expect(packFor("contacts")?.label).toBe("Contacts");
    expect(packFor("businesses")?.label).toBe("Accounts");
    expect(packFor("contacts")?.hint).toMatch(/not accounts/i);
    expect(packFor("businesses")?.hint).toMatch(/not Contacts/i);
  });

  it("allows end-to-end import for the six required entities", () => {
    for (const key of ["leads", "contacts", "businesses", "deals", "policies", "carriers"] as const) {
      const pack = packFor(key);
      expect(pack && canImport(pack)).toBe(true);
      expect(pack?.headers).toContain(key === "businesses" ? "name" : key === "policies" ? "policy_number" : key === "carriers" ? "agency_code" : key === "deals" ? "title" : "email");
    }
  });

  it("keeps template headers stable and newline-terminated", () => {
    const contacts = packFor("contacts")!;
    expect(templateCsv(contacts.headers)).toBe(`${contacts.headers.join(",")}\r\n`);
  });
});
