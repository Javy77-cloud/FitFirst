import { describe, expect, it } from "vitest";
import {
  AGENT_NAME,
  CONTACT_ID,
  DEAL_ID,
  DOCUMENT_VERSION_IDS,
  ELENA_DOC_DEC_ID,
  ELENA_DOC_POLICY_DEC_ID,
  ELENA_DOC_WIND_ID,
  ELENA_POLICY_ID,
  ELENA_PROPOSAL_ID,
  ELENA_QUOTE_GEO_ID,
  ELENA_QUOTE_PDF_GEO_ID,
  POLICY_CHANGE_LOG_IDS,
} from "@/lib/fixtures/ids";

describe("version history fixtures", () => {
  it("keeps Elena document and change-log ids off Ana and pack E quotes", () => {
    expect(ELENA_POLICY_ID).not.toBe(CONTACT_ID);
    expect(ELENA_DOC_WIND_ID).not.toBe(DEAL_ID);
    expect(ELENA_DOC_DEC_ID).not.toBe(ELENA_QUOTE_GEO_ID);
    expect(ELENA_DOC_WIND_ID).not.toBe(ELENA_PROPOSAL_ID);
    expect(ELENA_DOC_POLICY_DEC_ID).not.toBe(ELENA_QUOTE_PDF_GEO_ID);
    expect(Object.values(POLICY_CHANGE_LOG_IDS)).toHaveLength(5);
    expect(Object.values(DOCUMENT_VERSION_IDS)).toHaveLength(8);
    expect(AGENT_NAME).toBe("Maya Chen");
  });
});
