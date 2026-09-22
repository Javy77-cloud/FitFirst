import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
}));

import { SourceDocsUpload } from "@/components/deal/source-docs-upload";

describe("source docs upload type control", () => {
  it("keeps the document type dropdown and does not render upload-type chips", () => {
    const html = renderToStaticMarkup(
      createElement(SourceDocsUpload, {
        dealId: "deal-rosa",
        riskId: "risk-1",
        line: "home",
        product: "homeowners",
        quotingForm: "HO3",
        docSlot: "wind_mit",
        savedDocs: [{ docType: "dec", slot: "source_doc", tags: ["line:home"] }],
      }),
    );
    expect(html).not.toContain("data-ff-doc-slot");
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('aria-label="Required documents"');
    expect(html).toContain('aria-label="Doc type"');
    expect(html).toContain("<select");
    expect(html).toContain("Declaration page");
    expect(html).toContain("Wind mitigation");
    expect(html).toContain("Four-Point");
    expect(html).toContain("Photos");
    expect(html).toContain('value="wind_mit"');
  });
});
