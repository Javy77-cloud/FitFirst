import { describe, expect, it } from "vitest";
import { cell, normalizeEmail, parseCsv, rowsToCsv } from "./csv";

describe("import-export CSV", () => {
  it("parses quoted commas and stable headers", () => {
    const csv = `first_name,last_name,email,notes\r\nAna,Dib,ana.dib@desk.local,"Palm Bay, FL"\r\n`;
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(["first_name", "last_name", "email", "notes"]);
    expect(parsed.rows[0]?.notes).toBe("Palm Bay, FL");
    expect(normalizeEmail(cell(parsed.rows[0]!, "email"))).toBe("ana.dib@desk.local");
  });

  it("round-trips rows with the same headers", () => {
    const headers = ["id", "email"] as const;
    const body = rowsToCsv(headers, [["abc", "maya@fitfirst.local"]]);
    const parsed = parseCsv(body);
    expect(parsed.rows[0]).toEqual({ id: "abc", email: "maya@fitfirst.local" });
  });
});
