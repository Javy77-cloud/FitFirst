import { describe, expect, it } from "vitest";
import { classifyDocuSignSend } from "./docusign-envelopes";

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
