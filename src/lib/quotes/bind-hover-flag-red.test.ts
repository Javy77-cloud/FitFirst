import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Quotes Bind hover flag red", () => {
  it("locks navy default + flag-red hover on the Bind button classes", () => {
    const table = readFileSync("src/components/deal/quotes-results-table.tsx", "utf8");
    expect(table).toMatch(/data-ff-quote-bind=/);
    expect(table).toMatch(/hover:!bg-\[#BF0A30\]/);
    expect(table).toMatch(/!bg-\[#002868\]/);
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/button\[data-ff-quote-bind\]:enabled/);
    expect(css).toMatch(/#BF0A30/);
  });
});
