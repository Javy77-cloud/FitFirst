import { describe, expect, it } from "vitest";
import { CONTACT_ID, DEAL_ID } from "@/lib/fixtures/ids";
import {
  IN_DESK_ESIGN_LABEL,
  IN_DESK_ESIGN_PROVIDER,
  completeInDeskEsign,
  formatInDeskEsignList,
  inDeskSignHref,
  isDrawnSignature,
  isSignablePacket,
  mintInDeskToken,
  parseInDeskEsignStatus,
  requestInDeskEsign,
} from "./in-desk";

describe("in-desk e-sign stub", () => {
  it("labels the stub so DocuSign is not implied", () => {
    expect(IN_DESK_ESIGN_LABEL).toBe("In-desk stub — not DocuSign");
    expect(IN_DESK_ESIGN_PROVIDER).toBe("in_desk");
    expect(IN_DESK_ESIGN_PROVIDER).not.toBe("docusign");
  });

  it("requests and signs on the record without a vendor SDK", () => {
    const requested = requestInDeskEsign("none");
    expect(requested.status).toBe("requested");
    expect(requested.signedAt).toBeNull();
    expect(requested.requestedAt).toBeInstanceOf(Date);

    const signed = completeInDeskEsign({
      typedName: "Elena Ruiz",
      kind: "typed",
      drawnData: "",
      role: "agent_demo",
    });
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    expect(signed.status).toBe("signed");
    expect(signed.signerName).toBe("Elena Ruiz");
    expect(signed.kind).toBe("typed");
    expect(signed.role).toBe("agent_demo");
    expect(signed.signedAt).toBeInstanceOf(Date);
  });

  it("rejects a blank name or an empty drawing", () => {
    expect(completeInDeskEsign({ typedName: " ", kind: "typed", drawnData: "" }).ok).toBe(false);
    expect(
      completeInDeskEsign({
        typedName: "Elena Ruiz",
        kind: "drawn",
        drawnData: "data:image/png;base64,aa",
      }).ok,
    ).toBe(false);
    expect(isDrawnSignature("data:image/png;base64," + "A".repeat(120))).toBe(true);
  });

  it("shows status plus timestamp on list cells", () => {
    expect(formatInDeskEsignList("none")).toBe("—");
    expect(formatInDeskEsignList("requested", null, "2026-09-05T14:32:00.000Z")).toBe(
      "Requested · 2026-09-05 14:32 UTC",
    );
    expect(formatInDeskEsignList("signed", "2026-09-05T15:01:00.000Z")).toBe(
      "Signed · 2026-09-05 15:01 UTC",
    );
    expect(parseInDeskEsignStatus("nope")).toBe("none");
  });

  it("treats PDFs and signed-app slots as packets", () => {
    expect(isSignablePacket({ filename: "app.pdf", mimeType: "application/pdf" })).toBe(true);
    expect(isSignablePacket({ filename: "notes.txt", mimeType: "text/plain" })).toBe(false);
    expect(isSignablePacket({ filename: "app.bin", slot: "signed_app" })).toBe(true);
  });

  it("mints a public client token and keeps Ana ids off the sign path", () => {
    const token = mintInDeskToken();
    expect(token.startsWith("idesk-")).toBe(true);
    expect(inDeskSignHref(token, "agent_demo")).toBe(`/sign/${token}?role=agent_demo`);
    expect(DEAL_ID).not.toContain(token);
    expect(CONTACT_ID).not.toContain(token);
  });
});
