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
    expect(alert.createdAt).toBe("");
  });

  it("keeps a created day stamp for the panel", () => {
    const alert = toHeaderAlert({
      id: "a1",
      title: "Ask Maya",
      body: "Status on HO3-ELENA-2026",
      severity: "info",
      kind: "ask",
      readAt: null,
      entityType: "policy",
      entityId: "p1",
      createdAt: "2026-09-05T12:00:00.000Z",
    });
    expect(alert.createdAt).toMatch(/Sep 5/);
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

  it("maps a playbook ping onto the playbooks module", () => {
    const alert = toHeaderAlert({
      id: "a3",
      title: "Renewal 60 — shop task + alert · in-desk",
      body: "Shop this renewal 60 days out",
      severity: "info",
      kind: "playbook",
      readAt: null,
      entityType: "automation",
      entityId: "p1",
    });
    expect(alert.href).toBe("/automations/playbooks");
  });

  it("deep-links a coverage gap onto Contact Coverage with the related policy", () => {
    const alert = toHeaderAlert({
      id: "g1",
      title: "Coverage gap · Homeowners, no flood",
      body: "key:home-no-flood\nrelated:policy:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa\n\nElena has homeowners and no flood.",
      severity: "warning",
      kind: "coverage_gap",
      readAt: null,
      entityType: "contact",
      entityId: "c1",
    });
    expect(alert.href).toBe(
      "/contacts/c1?section=coverage&focusPolicy=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa#coverage",
    );
    expect(alert.body).toBe("Elena has homeowners and no flood.");
  });

  it("deep-links an opportunity onto Contact Opportunities with the related deal", () => {
    const alert = toHeaderAlert({
      id: "o1",
      title: "Opportunity · Flood deal still open",
      body: "key:deal:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb\nrelated:deal:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb\n\nFlood shop is still open.",
      severity: "info",
      kind: "opportunity",
      readAt: null,
      entityType: "contact",
      entityId: "c1",
    });
    expect(alert.href).toBe(
      "/contacts/c1?section=opportunities&focusDeal=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb#opportunities",
    );
    expect(alert.body).toBe("Flood shop is still open.");
  });

  it("opens HealthSherpa unmatched enrollments on the review queue", () => {
    const alert = toHeaderAlert({
      id: "hs1",
      title: "HealthSherpa enrollment needs review · Test Enrollment",
      body: "No strong match.",
      severity: "warning",
      kind: "signal",
      readAt: null,
      entityType: "healthsherpa_enrollment",
      entityId: "e1",
    });
    expect(alert.href).toBe("/contacts/healthsherpa-review?enrollment=e1");
  });

  it("deep-links a cold deal chase onto Quotes", () => {
    const alert = toHeaderAlert({
      id: "cold-1",
      title: "Deal went cold — one-click chase",
      body: "Ana Dib · 14 days with no platform-logged comms.",
      severity: "warning",
      kind: "deal_cold_chase",
      readAt: null,
      entityType: "deal",
      entityId: "d1",
    });
    expect(alert.href).toBe("/deals/d1?tab=quotes");
  });

  it("opens the specific lead for a follow-up ping", () => {
    const alert = toHeaderAlert({
      id: "a4",
      title: "Follow-up: Call Vazquez, Edmerson — due now.",
      body: "Vazquez, Edmerson",
      severity: "warning",
      kind: "lead_follow_up",
      readAt: null,
      entityType: "lead",
      entityId: "lead-9",
    });
    expect(alert.href).toBe("/leads/lead-9");
  });

  it("deep-links a day-of term start onto Compare", () => {
    const alert = toHeaderAlert({
      id: "term-1",
      title: "Ruiz, Camila · HO3",
      body: "<!--ff-panel:renewal_term_started:p9:2026-10-01-->\n\nHeritage 2026–27 term started today",
      severity: "info",
      kind: "renewal_term_started",
      readAt: null,
      entityType: "policy",
      entityId: "p9",
    });
    expect(alert.href).toBe("/policies/p9/compare");
  });

});
