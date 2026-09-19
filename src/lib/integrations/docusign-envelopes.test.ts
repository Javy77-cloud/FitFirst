import { describe, expect, it } from "vitest";
import {
  classifyDocuSignSend,
  envelopeIdFromConnectPayload,
  mapDocuSignEnvelopeStatus,
  signerTabSet,
} from "./docusign-envelopes";

describe("DocuSign fill-send classifier", () => {
  it("stubs when sandbox is not connected", () => {
    const result = classifyDocuSignSend({ connected: false });
    expect(result.status).toBe("needs_connect");
    expect(result.testPath).toBe("in_desk_stub");
    expect(result.message).toMatch(/in-desk/i);
    expect(result.message).not.toMatch(/envelope created/i);
  });

  it("marks sent only when the sandbox returns an envelope id", () => {
    const result = classifyDocuSignSend({
      connected: true,
      apiOk: true,
      envelopeId: "env-1",
    });
    expect(result.status).toBe("sent");
    expect(result.testPath).toBe("docusign_sandbox");
    expect(result.envelopeId).toBe("env-1");
  });

  it("keeps a local test path when the connected sandbox errors", () => {
    const result = classifyDocuSignSend({
      connected: true,
      apiOk: false,
      error: "SCOPE missing",
    });
    expect(result.status).toBe("sandbox_error");
    expect(result.testPath).toBe("in_desk_stub");
    expect(result.message).toContain("SCOPE missing");
  });
});

describe("DocuSign signer tabs and Connect status", () => {
  it("places signature, initials, and date tabs", () => {
    const tabs = signerTabSet();
    expect(tabs.signHereTabs[0]).toMatchObject({ documentId: "1", pageNumber: "1" });
    expect(tabs.initialHereTabs[0]).toMatchObject({ documentId: "1", pageNumber: "1" });
    expect(tabs.dateSignedTabs[0]).toMatchObject({ documentId: "1", pageNumber: "1" });
  });

  it("maps sandbox envelope statuses to sent / viewed / completed", () => {
    expect(mapDocuSignEnvelopeStatus("sent")).toBe("sent");
    expect(mapDocuSignEnvelopeStatus("delivered")).toBe("viewed");
    expect(mapDocuSignEnvelopeStatus("completed")).toBe("completed");
    expect(envelopeIdFromConnectPayload({ data: { envelopeId: "env-9", envelopeSummary: { status: "delivered" } } })).toEqual({
      envelopeId: "env-9",
      status: "delivered",
    });
  });
});
