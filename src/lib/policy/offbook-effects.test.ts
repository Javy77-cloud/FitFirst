import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  nextOffBookQueueStage,
  offBookQueueStageLeavesShopping,
  planOffBookSignalDismissals,
  planOffBookWorkClosures,
  shouldApplyOffBookEffects,
  OFF_BOOK_QUEUE_STAGE,
} from "./offbook-effects";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("shouldApplyOffBookEffects", () => {
  it("runs for lapsed, cancelled, non_renewed, expired and legacy aliases", () => {
    for (const status of [
      "lapsed",
      "cancelled",
      "non_renewed",
      "expired",
      "lapse",
      "canceled",
      "cancellation",
      "non_renewal",
      "terminated",
    ]) {
      expect(shouldApplyOffBookEffects(status), status).toBe(true);
    }
  });

  it("does not run for in-force or pre-issue statuses", () => {
    for (const status of ["active", "bound", "pending", "unpublished", "", null]) {
      expect(shouldApplyOffBookEffects(status), String(status)).toBe(false);
    }
  });
});

describe("planOffBookWorkClosures", () => {
  it("closes open renewal_30 and renewal_60 work and leaves other kinds", () => {
    expect(
      planOffBookWorkClosures([
        { id: "a30", kind: "renewal_30", status: "open" },
        { id: "a60", kind: "renewal_60", status: "open" },
        { id: "done", kind: "renewal_30", status: "done" },
        { id: "closed", kind: "renewal_60", status: "closed" },
        { id: "oep", kind: "oep_stay_put", status: "open" },
        { id: "svc", kind: "servicing", status: "open" },
      ]),
    ).toEqual(["a30", "a60"]);
  });
});

describe("planOffBookSignalDismissals", () => {
  it("marks unread autopilot and renewal-silence alerts for the policy", () => {
    expect(
      planOffBookSignalDismissals(
        [
          {
            id: "ap",
            kind: "renewal_autopilot",
            entityType: "policy",
            entityId: "p1",
            body: "<!--ff-panel:renewal_autopilot:p1:30to60-->",
          },
          {
            id: "sil",
            kind: "renewal_silence",
            entityType: "policy",
            entityId: "p1",
            body: "<!--ff-panel:renewal_silence:p1-->",
          },
          {
            id: "read",
            kind: "renewal_autopilot",
            readAt: new Date("2026-09-01T00:00:00.000Z"),
            entityType: "policy",
            entityId: "p1",
          },
          {
            id: "other",
            kind: "renewal_autopilot",
            entityType: "policy",
            entityId: "p2",
            body: "<!--ff-panel:renewal_autopilot:p2:under30-->",
          },
          {
            id: "body",
            kind: "renewal_autopilot",
            entityType: null,
            entityId: null,
            body: "<!--ff-panel:renewal_autopilot:p1:under30-->",
          },
        ],
        "p1",
      ),
    ).toEqual(["ap", "sil", "body"]);
  });
});

describe("nextOffBookQueueStage", () => {
  it("parks shopping, handled, bound, and lost rows onto the archive stage", () => {
    for (const stage of ["upcoming", "contacted", "quoted", "handled", "bound", "lost"]) {
      expect(nextOffBookQueueStage(stage), stage).toBe(OFF_BOOK_QUEUE_STAGE);
      expect(offBookQueueStageLeavesShopping(OFF_BOOK_QUEUE_STAGE)).toBe(true);
    }
  });

  it("leaves a row that is already parked", () => {
    expect(nextOffBookQueueStage("archive")).toBeNull();
    expect(nextOffBookQueueStage("archived")).toBeNull();
  });
});

describe("off-book status transition hooks", () => {
  it("runs the shared handler from every status writer and respects status in date sync", () => {
    const effects = source("src/lib/policy/offbook-effects.ts");
    expect(effects).toMatch(/export async function applyOffBookEffects\(/);
    expect(effects).toMatch(/demoteCurrentOnOffBookStatusMany/);
    expect(effects).toMatch(/OFF_BOOK_RENEWAL_WORK_KINDS = \["renewal_30", "renewal_60"\]/);
    expect(effects).toMatch(/OFF_BOOK_QUEUE_STAGE = "archive"/);
    expect(effects).not.toMatch(/status:\s*"archived"/);

    const record = source("src/app/actions/policy-record.ts");
    expect(record).toMatch(/applyOffBookEffects\(/);
    expect(record).toMatch(/shouldApplyOffBookEffects/);
    const sync = record.slice(record.indexOf("export async function syncPolicyDateAutomations"));
    const guard = sync.indexOf("isOffBookStatus");
    const reopen = sync.indexOf('status: "open"');
    expect(guard).toBeGreaterThan(-1);
    expect(reopen).toBeGreaterThan(guard);
    expect(sync).toMatch(/closeOffBookRenewalWork/);

    expect(source("src/app/actions/mass-update.ts")).toMatch(/applyOffBookEffectsMany/);
    expect(source("src/lib/policy/service.ts")).toMatch(/applyOffBookEffects\(/);
    expect(source("src/lib/custom-fields/record-system.ts")).toMatch(/applyOffBookEffects\(/);
    expect(source("src/lib/developer-hub/run-macro.ts")).toMatch(/applyOffBookEffects\(/);
    expect(source("src/lib/import-export/import.ts")).toMatch(/applyOffBookEffects\(/);
    expect(source("src/lib/zoho-import/import.ts")).toMatch(/applyOffBookEffects\(/);
  });
});
