import { describe, expect, it } from "vitest";
import {
  eoActionFromCommsKind,
  eoActionLabel,
  isEoAuditAction,
  isEoClientAction,
} from "./types";

describe("E&O audit actions", () => {
  it("covers every client interaction the pack logs", () => {
    for (const action of [
      "email",
      "sms",
      "call",
      "meeting",
      "doc_view",
      "reveal_pii",
      "policy_change",
      "role_switch",
      "doc_delete",
      "doc_restore",
    ]) {
      expect(isEoAuditAction(action)).toBe(true);
    }
    expect(isEoAuditAction("task")).toBe(false);
    expect(isEoClientAction("email")).toBe(true);
    expect(isEoClientAction("doc_view")).toBe(false);
  });

  it("maps comms kinds and keeps labels human", () => {
    expect(eoActionFromCommsKind("SMS")).toBe("sms");
    expect(eoActionFromCommsKind("task")).toBeNull();
    expect(eoActionLabel("reveal_pii")).toBe("Reveal PII");
    expect(eoActionLabel("doc_view")).toBe("Document view");
    expect(eoActionLabel("doc_delete")).toBe("Document delete");
    expect(eoActionLabel("doc_restore")).toBe("Document restore");
  });
});
