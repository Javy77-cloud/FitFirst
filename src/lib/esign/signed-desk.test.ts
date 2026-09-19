import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("signed retrieval desk", () => {
  it("exposes an agency-wide signed desk on /esign and /documents/signed", () => {
    const page = source("src/app/esign/page.tsx");
    const alias = source("src/app/documents/signed/page.tsx");
    const desk = source("src/components/esign/signed-retrieval-desk.tsx");
    const actions = source("src/app/actions/esign-retrieval.ts");
    const api = source("src/app/api/esign/signed/[id]/route.ts");
    const catalog = source("src/lib/desk/nav-catalog.ts");
    const layout = source("src/lib/desk/nav-layout.ts");
    expect(page).toMatch(/Signed documents/);
    expect(page).toMatch(/listSignedRetrievalRows/);
    expect(page).not.toMatch(/DocuSign and Dropbox Sign are not wired/);
    expect(alias).toMatch(/redirect\(`\/esign/);
    expect(desk).toMatch(/data-ff-signed-desk/);
    expect(desk).toMatch(/Client \/ signer/);
    expect(desk).toMatch(/Form type/);
    expect(source("src/lib/esign/retrieval.ts")).toMatch(/Applications \/ other/);
    expect(actions).toMatch(/resendDocuSignEnvelope/);
    expect(actions).toMatch(/createDocuSignRecipientView/);
    expect(api).toMatch(/downloadDocuSignCombinedPdf/);
    expect(catalog).toMatch(/id: "esign"/);
    expect(catalog).toMatch(/label: "Signed"/);
    expect(catalog).toMatch(/id: "email-templates"/);
    expect(catalog).not.toMatch(/id: "tasks"/);
    expect(layout).toMatch(/documents: \["esign"\]/);
    expect(layout).toMatch(/"email-templates"/);
  });
});
