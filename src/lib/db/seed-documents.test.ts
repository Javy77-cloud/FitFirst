import { describe, expect, it } from "vitest";
import { FORM_TEMPLATE_SEEDS } from "@/lib/forms/catalog";
import {
  ELENA_LOCATION_ID,
  ELENA_PROPOSAL_ID,
  ELENA_QUOTE_GEO_ID,
  ELENA_QUOTE_PDF_AI_ID,
  ELENA_QUOTE_PDF_GEO_ID,
  ELENA_QUOTE_PDF_TR_ID,
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

  it("gives Elena unique quote PDF ids that are not Ana or location rows", () => {
    expect(ELENA_QUOTE_PDF_AI_ID).not.toBe(ELENA_QUOTE_PDF_TR_ID);
    expect(ELENA_QUOTE_PDF_AI_ID).not.toBe(ELENA_LOCATION_ID);
    expect(ELENA_QUOTE_PDF_TR_ID).not.toBe(ELENA_LOCATION_ID);
    expect(ELENA_QUOTE_PDF_AI_ID).not.toContain("22222222");
    expect(ELENA_QUOTE_PDF_GEO_ID).not.toBe(ELENA_QUOTE_PDF_AI_ID);
    expect(ELENA_PROPOSAL_ID).not.toBe(ELENA_QUOTE_GEO_ID);
    expect(ELENA_QUOTE_GEO_ID).not.toContain("22222222");
  });

  it("keeps the ACORD stubs and adds agency cancellation + AOR", () => {
    const slugs = FORM_TEMPLATE_SEEDS.map((row) => row.slug);
    expect(slugs).toContain("fl-ho3");
    expect(slugs).toContain("fl-home-packet");
    expect(slugs).toContain("agency-cancellation");
    expect(slugs).toContain("agency-aor");
  });
});
