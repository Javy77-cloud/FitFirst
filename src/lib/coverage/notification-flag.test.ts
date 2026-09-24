import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { planEpisodeSync } from "@/lib/alerts/episode";
import { unreadNotificationCount } from "@/lib/desk/notifications";

const insert = vi.fn();
const remove = vi.fn();
const select = vi.fn();
const after = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({
  after: (...args: unknown[]) => after(...args),
}));
vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => insert(...args),
    delete: (...args: unknown[]) => remove(...args),
    select: (...args: unknown[]) => select(...args),
  },
}));

import {
  COVERAGE_GAP_NOTIFICATIONS_ENABLED,
  coverageGapAlertsHiddenWhere,
  coverageGapNotificationsEnabled,
  filterNotificationRows,
} from "./notification-flag";
import { planContactNotices } from "./notices";
import { scheduleContactCoverageNotices } from "./schedule-notices";
import { syncContactCoverageNotices } from "./sync-notices";

const DOMENIC_POLICIES = [
  {
    id: "auto-1",
    status: "active",
    lineOfBusiness: "AUTO",
    policyNumber: "AUTO-1",
  },
];

describe("coverage-gap notification flag", () => {
  beforeEach(() => {
    insert.mockReset();
    remove.mockReset();
    select.mockReset();
    after.mockReset();
    delete process.env.COVERAGE_GAP_NOTIFICATIONS_ENABLED;
  });

  it("defaults off unless the env flag is explicitly on", () => {
    expect(COVERAGE_GAP_NOTIFICATIONS_ENABLED).toBe(false);
    expect(coverageGapNotificationsEnabled({})).toBe(false);
    expect(coverageGapNotificationsEnabled({ COVERAGE_GAP_NOTIFICATIONS_ENABLED: "0" })).toBe(false);
    expect(coverageGapNotificationsEnabled({ COVERAGE_GAP_NOTIFICATIONS_ENABLED: "false" })).toBe(false);
    expect(coverageGapNotificationsEnabled({ COVERAGE_GAP_NOTIFICATIONS_ENABLED: "1" })).toBe(true);
    expect(coverageGapNotificationsEnabled({ COVERAGE_GAP_NOTIFICATIONS_ENABLED: "true" })).toBe(true);
  });

  it("viewing a client with gaps creates no notification when the flag is off", async () => {
    const planned = planContactNotices({
      contactId: "domenic",
      partyName: "Domenic Iori",
      policies: DOMENIC_POLICIES,
      deals: [],
    });
    expect(planned.some((row) => row.kind === "coverage_gap" && row.title.includes("No personal umbrella"))).toBe(
      true,
    );
    expect(
      planned.some((row) => row.kind === "coverage_gap" && row.title.includes("Auto on the books — no homeowners")),
    ).toBe(true);

    const written = await syncContactCoverageNotices("domenic");
    scheduleContactCoverageNotices("domenic");

    expect(written).toEqual([]);
    expect(insert).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("does not schedule a write from the contact page render", () => {
    const page = readFileSync("src/app/contacts/[id]/page.tsx", "utf8");
    expect(page).toMatch(/ContactCoveragePanel/);
    expect(page).toMatch(/ContactOpportunitiesPanel/);
    expect(page).not.toMatch(/scheduleContactCoverageNotices/);
    expect(page).not.toMatch(/syncContactCoverageNotices/);
  });

  it("keeps saves on the single scheduler, which itself checks the flag", () => {
    const schedule = readFileSync("src/lib/coverage/schedule-notices.ts", "utf8");
    const sync = readFileSync("src/lib/coverage/sync-notices.ts", "utf8");
    expect(schedule).toMatch(/coverageGapNotificationsEnabled/);
    expect(sync).toMatch(/if \(!coverageGapNotificationsEnabled\(\)\) return \[\]/);
    for (const file of [
      "src/app/actions/contacts-ops.ts",
      "src/app/actions/custom-fields.ts",
      "src/app/actions/crm.ts",
      "src/app/actions/deal-create.ts",
      "src/app/actions/policy-record.ts",
    ]) {
      expect(readFileSync(file, "utf8")).toMatch(/scheduleContactCoverageNotices/);
    }
  });

  it("excludes existing coverage-gap rows from lists and unread counts and leaves other kinds", () => {
    const rows = [
      {
        id: "gap-domenic",
        kind: "coverage_gap",
        read: false,
        title: "Coverage gap · No personal umbrella",
      },
      {
        id: "gap-zoila",
        kind: "coverage_gap",
        read: false,
        title: "Coverage gap · Home on the books — no auto",
      },
      { id: "renewal", kind: "renewal_silence", read: false, title: "Renewal silence" },
      { id: "promise", kind: "commitment_nudge", read: false, title: "Promise due" },
      { id: "work", kind: "deal_cold_chase", read: true, title: "Deal went cold" },
      { id: "inbox", kind: "inbox_mail", read: false, title: "Inbox needs you" },
    ];

    const hidden = filterNotificationRows(rows, false);
    expect(hidden.map((row) => row.id)).toEqual(["renewal", "promise", "work", "inbox"]);
    expect(hidden.some((row) => row.kind === "coverage_gap")).toBe(false);
    expect(unreadNotificationCount(hidden)).toBe(3);
    expect(unreadNotificationCount(rows.filter((row) => row.kind !== "coverage_gap"))).toBe(3);

    const shown = filterNotificationRows(rows, true);
    expect(shown.map((row) => row.id)).toEqual(rows.map((row) => row.id));
    expect(unreadNotificationCount(shown)).toBe(5);

    expect(coverageGapAlertsHiddenWhere(false)).toBeTruthy();
    expect(coverageGapAlertsHiddenWhere(true)).toBeUndefined();

    const header = readFileSync("src/lib/db/header-alerts.ts", "utf8");
    const queries = readFileSync("src/lib/db/queries.ts", "utf8");
    expect(header).toMatch(/coverageGapAlertsHiddenWhere/);
    expect(queries).toMatch(/coverageGapAlertsHiddenWhere/);
    expect(queries).toMatch(/coverageGapUnreadCountExclusion/);
  });
});

describe("why a marked-read coverage gap can come back", () => {
  it("dedupe keeps the first row and deletes the read copy for the same key", () => {
    const plan = planEpisodeSync(["coverage_gap:no-umbrella"], [
      { id: "unread-first", key: "coverage_gap:no-umbrella" },
      { id: "marked-read", key: "coverage_gap:no-umbrella" },
    ]);
    expect(plan.insertKeys).toEqual([]);
    expect(plan.endEpisodeAlertIds).toEqual(["marked-read"]);
  });

  it("deletes a read row when the gap key drops, so the next view inserts a new unread one", () => {
    const cleared = planEpisodeSync([], [{ id: "read-gap", key: "coverage_gap:auto-no-home" }]);
    expect(cleared.endEpisodeAlertIds).toEqual(["read-gap"]);
    const again = planEpisodeSync(["coverage_gap:auto-no-home"], []);
    expect(again.insertKeys).toEqual(["coverage_gap:auto-no-home"]);
  });
});
