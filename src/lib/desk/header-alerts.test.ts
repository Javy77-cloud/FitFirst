import { describe, expect, it } from "vitest";
import { toHeaderAlert } from "./header-alerts";

describe("toHeaderAlert", () => {
  it("maps an unread alert onto the record href", () => {
    const alert = toHeaderAlert({
      id: "a1",
      title: "Ask Maya",
      body: "Status on HO3-ELENA-2026",
      severity: "info",
      kind: "ask",
      readAt: null,
      entityType: "policy",
      entityId: "p1",
    });
    expect(alert.read).toBe(false);
    expect(alert.href).toBe("/policies/p1");
  });
});
