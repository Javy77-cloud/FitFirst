import { describe, expect, it } from "vitest";
import { CONTACT_ID } from "@/lib/fixtures/ids";
import {
  classifyOpportunityLine,
  coverageNoticeHref,
  displayNoticeBody,
  encodeNoticeBody,
  isOpenDealStage,
  noticeHrefFromAlert,
  parseNoticeKey,
  parseNoticeRelated,
  planContactNotices,
} from "./notices";
import { planEpisodeSync } from "@/lib/alerts/episode";
import { readFileSync } from "node:fs";

function policy(partial: { id: string; status?: string; lineOfBusiness?: string }) {
  return {
    id: partial.id,
    status: partial.status ?? "active",
    lineOfBusiness: partial.lineOfBusiness ?? "HO",
    policyNumber: partial.id.toUpperCase(),
  };
}

describe("contact coverage / opportunity notices", () => {
  it("keeps Coverage and Opportunities on the contact with deep links", () => {
    expect(coverageNoticeHref({ contactId: "c1", hash: "coverage", policyId: "p1" })).toBe(
      "/contacts/c1?section=coverage&focusPolicy=p1#coverage",
    );
    expect(coverageNoticeHref({ contactId: "c1", hash: "opportunities", dealId: "d1" })).toBe(
      "/contacts/c1?section=opportunities&focusDeal=d1#opportunities",
    );
  });

  it("does not invent Ana alerts — quotes are not coverage", () => {
    expect(
      planContactNotices({
        contactId: CONTACT_ID,
        partyName: "Ana Dib",
        firstName: "Ana",
        lastName: "Dib",
        policies: [],
        deals: [{ id: "d1", title: "Dib HO3", pipelineStage: "quote_sent", lineOfBusiness: "HO" }],
        quoteCount: 10,
      }),
    ).toEqual([]);
  });

  it("plans a coverage-gap ping plus an open-deal opportunity from in-force only", () => {
    const planned = planContactNotices({
      contactId: "elena",
      partyName: "Elena Ruiz",
      policies: [policy({ id: "ho3-elena", lineOfBusiness: "HO3" })],
      deals: [
        { id: "flood-shop", title: "Elena · Flood", pipelineStage: "shopping", lineOfBusiness: "FLOOD" },
        { id: "won", title: "Closed", pipelineStage: "closed_won", lineOfBusiness: "AUTO" },
      ],
    });
    expect(planned.map((row) => row.key)).toEqual(["home-no-auto", "home-no-flood", "deal:flood-shop", "no-umbrella"]);
    const floodGap = planned.find((row) => row.key === "home-no-flood");
    expect(floodGap?.kind).toBe("coverage_gap");
    expect(floodGap?.href).toBe("/contacts/elena?section=coverage&focusPolicy=ho3-elena#coverage");
    expect(floodGap?.relatedId).toBe("ho3-elena");
    const floodDeal = planned.find((row) => row.key === "deal:flood-shop");
    expect(floodDeal?.kind).toBe("opportunity");
    expect(floodDeal?.href).toBe(
      "/contacts/elena?section=opportunities&focusDeal=flood-shop#opportunities",
    );
    expect(planned.some((row) => row.key === "deal:won")).toBe(false);
  });

  it("does not fire an opportunity for a closed or bound deal", () => {
    expect(isOpenDealStage("closed_won")).toBe(false);
    expect(isOpenDealStage("bound")).toBe(false);
    expect(isOpenDealStage("shopping")).toBe(true);
    expect(isOpenDealStage("quote_sent")).toBe(true);
    const planned = planContactNotices({
      contactId: "c1",
      partyName: "Ivy Soto",
      policies: [policy({ id: "pa", lineOfBusiness: "AUTO" })],
      deals: [{ id: "home-won", title: "HO", pipelineStage: "bound", lineOfBusiness: "HO" }],
    });
    expect(planned.every((row) => row.kind === "coverage_gap")).toBe(true);
    expect(planned.some((row) => row.key.startsWith("deal:"))).toBe(false);
  });

  it("does not invent an opportunity from a leftover picklist value", () => {
    const leftover = planContactNotices({
      contactId: "c1",
      partyName: "Ivy Soto",
      policies: [policy({ id: "pa", lineOfBusiness: "AUTO" })],
      deals: [],
    });
    expect(leftover.some((row) => row.key.startsWith("tagged:"))).toBe(false);
    expect(leftover.some((row) => row.kind === "opportunity")).toBe(false);
  });

  it("maps Home / Condo tags onto HO and encodes parseable notice bodies", () => {
    expect(classifyOpportunityLine("Home")).toBe("HO");
    expect(classifyOpportunityLine("Condo")).toBe("HO");
    const body = encodeNoticeBody({
      key: "home-no-flood",
      relatedType: "policy",
      relatedId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      plain: "No flood on the books.",
    });
    expect(parseNoticeKey(body)).toBe("home-no-flood");
    expect(parseNoticeRelated(body)).toEqual({
      type: "policy",
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(displayNoticeBody(body)).toBe("No flood on the books.");
    expect(
      noticeHrefFromAlert({
        kind: "coverage_gap",
        body,
        entityType: "contact",
        entityId: "c1",
      }),
    ).toBe("/contacts/c1?section=coverage&focusPolicy=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa#coverage");
  });

  it("does not plan a missing-homeowners notice when HO is with another carrier", () => {
    const planned = planContactNotices({
      contactId: "rosa",
      partyName: "Rosa Castellanos",
      policies: [policy({ id: "pa", lineOfBusiness: "AUTO" })],
      deals: [],
      declaredCoverage: [{ line: "HO", carrierOfRecord: "other" }],
    });
    expect(planned.some((row) => row.key === "auto-no-home")).toBe(false);
    expect(planned.some((row) => row.key === "tagged:Home")).toBe(false);
  });

  it("does not treat a quoted row as in-force coverage", () => {
    const planned = planContactNotices({
      contactId: "c1",
      partyName: "Shop only",
      policies: [policy({ id: "q", status: "quoted", lineOfBusiness: "HO" })],
      deals: [],
    });
    expect(planned).toEqual([]);
  });
});

describe("coverage notice episode suppress (mark-as-read)", () => {
  it("does not re-insert after mark-as-read while the gap key is still live", () => {
    const live = ["coverage_gap:home-no-flood", "opportunity:deal:flood-shop"];
    const plan = planEpisodeSync(live, [
      { id: "read-gap", key: "coverage_gap:home-no-flood" },
    ]);
    expect(plan.insertKeys).toEqual(["opportunity:deal:flood-shop"]);
    expect(plan.endEpisodeAlertIds).toEqual([]);
  });

  it("ends the episode when the gap clears so a later gap can re-alert", () => {
    const plan = planEpisodeSync(["opportunity:deal:flood-shop"], [
      { id: "old-gap", key: "coverage_gap:home-no-flood" },
      { id: "keep", key: "opportunity:deal:flood-shop" },
    ]);
    expect(plan.insertKeys).toEqual([]);
    expect(plan.endEpisodeAlertIds).toEqual(["old-gap"]);
  });

  it("sync-notices uses planEpisodeSync (not unread-only)", () => {
    const src = readFileSync("src/lib/coverage/sync-notices.ts", "utf8");
    expect(src).toMatch(/planEpisodeSync/);
    expect(src).not.toMatch(/if \(row\.readAt\) continue/);
  });
});

  it("collapses duplicate coverage-gap rows for the same live key", () => {
    const live = ["coverage_gap:no-umbrella", "coverage_gap:home-no-auto"];
    const plan = planEpisodeSync(live, [
      { id: "keep-umb", key: "coverage_gap:no-umbrella" },
      { id: "dupe-umb-1", key: "coverage_gap:no-umbrella" },
      { id: "dupe-umb-2", key: "coverage_gap:no-umbrella" },
      { id: "dupe-umb-3", key: "coverage_gap:no-umbrella" },
      { id: "keep-auto", key: "coverage_gap:home-no-auto" },
    ]);
    expect(plan.insertKeys).toEqual([]);
    expect(plan.endEpisodeAlertIds.sort()).toEqual(["dupe-umb-1", "dupe-umb-2", "dupe-umb-3"]);
  });

  it("coverage sync coalesces concurrent contact writers", () => {
    const src = readFileSync("src/lib/coverage/sync-notices.ts", "utf8");
    expect(src).toMatch(/coalesceAsync/);
    expect(src).toMatch(/coverage-notices:/);
  });
