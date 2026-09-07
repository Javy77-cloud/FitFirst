import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionToast } from "@/components/desk/action-toast";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("site-wide action confirmation toast", () => {
  it("renders confirmation copy at the shared top-center host", () => {
    const html = renderToStaticMarkup(createElement(ActionToast, { message: "Deal details saved" }));
    expect(html).toContain("Deal details saved");
    expect(html).toContain('data-testid="action-toast"');
    expect(html).toContain('data-ff-action-toast=""');
    expect(html).toContain("bg-navy");

    const host = source("src/components/desk/action-toast.tsx");
    expect(host).toMatch(/data-ff-action-toast-host/);
    expect(host).toMatch(/fixed inset-x-0 top-4/);
    expect(host).toMatch(/justify-center/);
    expect(host).toMatch(/FLASH_DISMISS_MS/);
    expect(host).toMatch(/aria-label="Dismiss"/);
    expect(host).toMatch(/searchParams\.get\(FLASH_PARAM\)/);
    expect(host).toMatch(/FLASH_EVENT/);

    const layout = source("src/app/layout.tsx");
    expect(layout).toMatch(/ActionToastHost/);
    expect(layout).toMatch(/<ActionToastHost \/>/);
  });

  it("saves Deal Details and the master sheet through flashAction", () => {
    const values = source("src/app/actions/custom-fields.ts");
    expect(values).toMatch(/flashAction\(`\/deals\/\$\{dealId\}`, "deal-details-saved"\)/);
    expect(values).toMatch(/throw new Error\("Deal details could not be saved\."\)/);

    const sheet = source("src/app/actions/quote-sheet.ts");
    expect(sheet).toMatch(/flashAction\(dest, "sheet-saved"\)/);
    expect(sheet).toMatch(/flashAction\(returnTo \|\| `\/deals\/\$\{dealId\}\?tab=documents/);

    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    expect(panel).toMatch(/action=\{saveDealFieldValues\}/);
    expect(panel).toMatch(/Save deal details/);

    const master = source("src/components/deal/master-sheet-compare.tsx");
    expect(master).toMatch(/action=\{saveQuoteSheet\}/);
    expect(master).toMatch(/Save sheet/);
    expect(master).toMatch(/name="returnTo"/);
  });

  it("wires the same helper on other silent deal/desk mutations", () => {
    expect(source("src/app/actions/record-tags.ts")).toMatch(
      /flashAction\(paths\.detail\(recordId\), "tags-saved"\)/,
    );
    expect(source("src/app/actions/documents.ts")).toMatch(
      /redirect\(withFlash\(returnTo, "document-deleted"\)\)/,
    );
    expect(source("src/app/actions/document-versions.ts")).toMatch(
      /flashAction\(dest, "document-replaced"\)/,
    );
    expect(source("src/app/actions/deal-desk.ts")).toMatch(
      /flashAction\(`\/deals\/\$\{dealId\}\?tab=markets`, "market-added"\)/,
    );
    expect(source("src/app/actions/record-edit.ts")).toMatch(
      /flashAction\(`\/deals\/\$\{id\}`, "deal-updated"\)/,
    );
    expect(source("src/app/actions/quotes.ts")).toMatch(
      /flashAction\(`\/deals\/\$\{dealId\}\?tab=quotes`, "quotes-requested"\)/,
    );
    expect(source("src/app/actions/lifecycle.ts")).toMatch(
      /withFlash\(`\/deals\/\$\{dealId\}\?tab=documents&line=\$\{line\}&notice=filled`, "sheet-filled"\)/,
    );
    expect(source("src/lib/flash-action.ts")).toMatch(/export function flashAction/);
    expect(source("src/lib/flash-client.ts")).toMatch(/export function flashAction/);
  });
});
