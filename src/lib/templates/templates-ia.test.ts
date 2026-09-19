import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { partitionEmailTemplates } from "./library";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("templates IA", () => {
  it("renames Document templates to Documents and keeps Tasks", () => {
    const catalog = source("src/lib/desk/nav-catalog.ts");
    expect(catalog).toMatch(/id: "document-templates"/);
    expect(catalog).toMatch(/label: "Documents"/);
    expect(catalog).not.toMatch(/Document templates/);
    expect(catalog).toMatch(/id: "tasks"/);
    expect(catalog).toMatch(/label: "Tasks"/);
    expect(catalog).toMatch(/id: "business"/);
    expect(catalog).toMatch(/href: "\/accounts"/);
  });

  it("splits the Templates hub into Email vs Documents", () => {
    const hub = source("src/components/templates/templates-hub.tsx");
    expect(hub).toMatch(/data-ff-templates-section=\{id\}/);
    expect(hub).toMatch(/kicker="Email"/);
    expect(hub).toMatch(/kicker="Documents"/);
    expect(hub).not.toMatch(/Document templates/);
    expect(hub).toMatch(/Email templates/);
    expect(hub).toMatch(/Agency signature/);
    expect(source("src/app/templates/page.tsx")).toMatch(/TemplatesHub/);
  });

  it("keeps the agency signature editor on a live preview + {{signature}}", () => {
    const editor = source("src/components/templates/email-signature-editor.tsx");
    expect(editor).toMatch(/data-ff-signature-preview/);
    expect(editor).toMatch(/\{\{signature\}\}/);
    expect(editor).toMatch(/Test-send to me/);
    expect(source("src/app/settings/email-signatures/page.tsx")).toMatch(/EmailSignatureEditor/);
  });

  it("wires fill confirm + eSign without mixing email into Documents", () => {
    const docs = source("src/app/documents/page.tsx");
    expect(docs).toMatch(/TypeCarrierBrowse/);
    expect(docs).toMatch(/FormSendLoop/);
    expect(docs).not.toMatch(/\/automations\/templates/);
    expect(source("src/components/documents/form-send-loop.tsx")).toMatch(/Send to DocuSign/);
    expect(source("src/components/documents/fill-esign-panel.tsx")).toMatch(/confirmFilledFormForEsign/);
    expect(source("src/app/documents/fill/[slug]/page.tsx")).toMatch(/FillEsignPanel/);
  });

  it("partitions system vs custom email templates", () => {
    const { system, custom } = partitionEmailTemplates([
      { kind: "google_review", isSeeded: true, slug: "review" },
      { kind: "custom", isSeeded: false, slug: "mine" },
    ]);
    expect(system).toHaveLength(1);
    expect(custom).toHaveLength(1);
  });
});
