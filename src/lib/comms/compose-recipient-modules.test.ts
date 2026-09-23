import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("compose recipient modules", () => {
  it("resolves deal Quick Comms email via contact → lead → account → deal CF", () => {
    const dealPage = source("src/app/deals/[id]/page.tsx");
    expect(dealPage).toMatch(
      /resolvePartyEmail\(\{ contact, lead, account, dealStored: dealValues \}\)/,
    );
    expect(dealPage).not.toMatch(/contactEmail=\{contact\?\.email \?\? lead\?\.email\}/);
  });

  it("sizes the shared compose popup for ~4 sentences + signature", () => {
    const compose = source("src/components/comms/quick-comms-email-compose.tsx");
    expect(compose).toMatch(/w-\[min\(92vw,74rem\)\]/);
    expect(compose).toMatch(/sm:max-w-\[74rem\]/);
    expect(compose).toMatch(/max-h-\[min\(80vh,56rem\)\]/);
    expect(compose).toMatch(/min-h-\[12rem\]/);
    expect(compose).not.toMatch(/w-\[min\(90vw,42rem\)\]/);
    expect(compose).not.toMatch(/max-h-\[56vh\]/);
  });
});
