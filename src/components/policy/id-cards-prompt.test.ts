import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("ID cards prompt + quiet upload", () => {
  it("asks Yes/No first, then opens durable upload with clear/rename/cancel forever-dismiss", () => {
    const prompt = source("src/components/policy/id-cards-prompt.tsx");
    expect(prompt).toMatch(/data-ff-id-cards-yes/);
    expect(prompt).toMatch(/data-ff-id-cards-no/);
    expect(prompt).toMatch(/setStep\("upload"\)/);
    expect(prompt).not.toMatch(/uploadDealSlot/);
    expect(prompt).toMatch(/IdCardsUploadPanel/);
    expect(prompt).toMatch(/dismissOnSuccess/);
    expect(prompt).toMatch(/onCancel/);

    const panel = source("src/components/policy/id-cards-upload-panel.tsx");
    expect(panel).toMatch(/uploadPolicyIdCards/);
    expect(panel).toMatch(/data-ff-id-cards-rename/);
    expect(panel).toMatch(/data-ff-id-cards-clear/);
    expect(panel).toMatch(/data-ff-id-cards-upload-submit/);
    expect(panel).toMatch(/multiple/);

    const actions = source("src/app/actions/policy-files.ts");
    expect(actions).toMatch(/persistFile/);
    expect(actions).toMatch(/docType: "policy_id"/);
    expect(actions).toMatch(/slot: "policy_file"/);
    expect(actions).toMatch(/writeStoredFile|persistFile/);
    expect(actions).not.toMatch(/writeFile\(abs/);

    const docs = source("src/components/policy/tabs/documents-tab.tsx");
    expect(docs).toMatch(/data-ff-id-cards-quiet/);
    expect(docs).toMatch(/IdCardsUploadPanel/);
    expect(docs).toMatch(/attachPolicyFiles/);
    expect(docs).not.toMatch(/uploadDealSlot/);
  });

  it("keeps Domenic mint DEC retag path for policy_dec", () => {
    const actions = source("src/app/actions/policy-files.ts");
    expect(actions).toMatch(/ensureDomenicMintDecRetag/);
    expect(actions).toMatch(/policy_dec/);
    const constants = source("src/lib/policy/dec-prompt.ts");
    expect(constants).toMatch(/DOMENIC_IORI_DEC_DOCUMENT_ID/);
    expect(constants).toMatch(/cf3a14da-70f0-4042-b8cb-0e6e2692025a/);
  });
});
