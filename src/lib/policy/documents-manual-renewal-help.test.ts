import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Copy that used to render under every policy Documents tab. */
const BANNED = ["Manual renewal upload", "park paper here"] as const;

const DOCUMENTS_TAB = "src/components/policy/tabs/documents-tab.tsx";

function productionSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      productionSources(path, out);
      continue;
    }
    if (!/\.(tsx|ts|jsx|js)$/.test(entry)) continue;
    if (/\.test\.(tsx|ts|jsx|js)$/.test(entry)) continue;
    out.push(path);
  }
  return out;
}

describe("policy Documents tab manual-renewal how-to", () => {
  it("does not render the shared how-to block", () => {
    const markup = readFileSync(DOCUMENTS_TAB, "utf8");
    for (const phrase of BANNED) {
      expect(markup, phrase).not.toContain(phrase);
    }
    expect(markup).not.toContain("data-ff-manual-renewal-help");
    expect(markup).not.toContain("No AMS renewal API yet");
    expect(markup).toMatch(/PolicyDocumentsAttach/);
    expect(markup).toMatch(/PolicyDocumentsTable/);
    expect(markup).toMatch(/FillCompareFromDecsButton/);
  });

  it("is not re-rendered from any other production file", () => {
    const hits: string[] = [];
    for (const file of productionSources("src")) {
      const text = readFileSync(file, "utf8");
      for (const phrase of BANNED) {
        if (text.includes(phrase)) hits.push(`${file}: ${phrase}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
