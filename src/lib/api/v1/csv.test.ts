import { describe, expect, it } from "vitest";
import { csvEscape, csvFilename, toCsv } from "./csv";

describe("CSV export helpers", () => {
  it("quotes commas, quotes, and newlines", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("Ruiz, Elena")).toBe('"Ruiz, Elena"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("line\nbreak")).toBe('"line\nbreak"');
    expect(csvEscape(null)).toBe("");
  });

  it("builds a CRLF sheet with a header row", () => {
    const csv = toCsv(["id", "name"], [["1", "Elena"], ["2", "Ana, Dib"]]);
    expect(csv).toBe('id,name\r\n1,Elena\r\n2,"Ana, Dib"\r\n');
  });

  it("names files by kind and UTC day", () => {
    expect(csvFilename("contacts", new Date("2026-09-04T16:00:00.000Z"))).toBe(
      "fitfirst-contacts-2026-09-04.csv",
    );
  });
});
