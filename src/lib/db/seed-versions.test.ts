import { describe, expect, it } from "vitest";
import {
  AGENT_NAME,
  CONTACT_ID,
  DOCUMENT_VERSION_IDS,
  ELENA_DOC_WIND_ID,
  ELENA_POLICY_ID,
  POLICY_CHANGE_LOG_IDS,
} from "@/lib/fixtures/ids";
import { DEAL_ID } from "@/lib/fixtures/ids";

describe("version history fixtures", () => {
  it("keeps Elena document and change-log ids off Ana", () => {
    expect(ELENA_POLICY_ID).not.toBe(CONTACT_ID);
    expect(ELENA_DOC_WIND_ID).not.toBe(DEAL_ID);
    expect(Object.values(POLICY_CHANGE_LOG_IDS)).toHaveLength(5);
    expect(Object.values(DOCUMENT_VERSION_IDS)).toHaveLength(8);
    expect(AGENT_NAME).toBe("Maya Chen");
  });
});
