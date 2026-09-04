import { describe, expect, it } from "vitest";
import { FORM_TEMPLATE_SEEDS } from "@/lib/forms/catalog";
import {
  FOLDER_ACORD_ID,
  FOLDER_AGENCY_FORMS_ID,
  FOLDER_DIB_ACCOUNT_ID,
  FOLDER_DIB_DEAL_ID,
  FOLDER_MARKETING_ID,
} from "@/lib/fixtures/ids";

describe("document library seed", () => {
  it("keeps Ana folder ids unused by the Shared/Forms libraries", () => {
    const libraryFolders = [FOLDER_MARKETING_ID, FOLDER_ACORD_ID, FOLDER_AGENCY_FORMS_ID];
    expect(libraryFolders).not.toContain(FOLDER_DIB_ACCOUNT_ID);
    expect(libraryFolders).not.toContain(FOLDER_DIB_DEAL_ID);
  });

  it("keeps the ACORD stubs and adds agency cancellation + AOR", () => {
    const slugs = FORM_TEMPLATE_SEEDS.map((row) => row.slug);
    expect(slugs).toContain("fl-ho3");
    expect(slugs).toContain("fl-home-packet");
    expect(slugs).toContain("agency-cancellation");
    expect(slugs).toContain("agency-aor");
  });
});
