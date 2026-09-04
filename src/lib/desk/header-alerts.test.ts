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

  it("maps an FNOL ping onto the claim record", () => {
    const alert = toHeaderAlert({
      id: "a2",
      title: "FNOL · Ruiz, Camila · AI-HO-66102",
      body: "Water notice is referred to carrier. Carrier claim AI-CLM-19044.",
      severity: "warning",
      kind: "fnol",
      readAt: null,
      entityType: "claim",
      entityId: "c1",
    });
    expect(alert.href).toBe("/claims/c1");
    expect(alert.kind).toBe("fnol");
  });
});
