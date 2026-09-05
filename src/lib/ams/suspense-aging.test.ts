import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "@/lib/home/as-of";
import {
  ageSuspenseRow,
  countSuspenseByAge,
  daysOpen,
  filterSuspenseByAge,
  suspenseAgeBucket,
} from "./suspense-aging";

describe("suspense aging", () => {
  it("buckets days open from the desk clock", () => {
    expect(suspenseAgeBucket(0)).toBe("current");
    expect(suspenseAgeBucket(7)).toBe("current");
    expect(suspenseAgeBucket(10)).toBe("watch");
    expect(suspenseAgeBucket(22)).toBe("aging");
    expect(suspenseAgeBucket(37)).toBe("stale");
  });

  it("ages Elena AOR as watch and Hale packet as aging / stale", () => {
    const elena = ageSuspenseRow(
      {
        taskId: "elena-aor",
        policyId: "elena",
        policyNumber: "HO3-ELENA-2026",
        partyName: "Ruiz, Elena",
        docKey: "aor",
        title: "Collect AOR packet · HO3-ELENA-2026",
        dueDate: new Date("2026-09-15T16:00:00.000Z"),
        status: "open",
        openedAt: new Date("2026-08-24T16:00:00.000Z"),
      },
      DESK_AS_OF,
    );
    const haleId = ageSuspenseRow(
      {
        taskId: "hale-id",
        policyId: "hale",
        policyNumber: "HP-FL-88421",
        partyName: "Hale, Jordan",
        docKey: "id_card",
        title: "Collect ID cards · HP-FL-88421",
        dueDate: new Date("2026-09-18T16:00:00.000Z"),
        status: "open",
        openedAt: new Date("2026-07-28T16:00:00.000Z"),
      },
      DESK_AS_OF,
    );
    const haleAor = ageSuspenseRow(
      {
        taskId: "hale-aor",
        policyId: "hale",
        policyNumber: "HP-FL-88421",
        partyName: "Hale, Jordan",
        docKey: "aor",
        title: "Collect AOR packet · HP-FL-88421",
        dueDate: new Date("2026-09-18T16:00:00.000Z"),
        status: "open",
        openedAt: new Date("2026-08-12T16:00:00.000Z"),
      },
      DESK_AS_OF,
    );
    expect(daysOpen(elena.openedAt, DESK_AS_OF)).toBe(10);
    expect(elena.age).toBe("watch");
    expect(haleAor.age).toBe("aging");
    expect(haleId.age).toBe("stale");
    const aged = [elena, haleId, haleAor];
    expect(filterSuspenseByAge(aged, "stale").map((row) => row.taskId)).toEqual(["hale-id"]);
    expect(countSuspenseByAge(aged)).toEqual({ current: 0, watch: 1, aging: 1, stale: 1 });
    expect(filterSuspenseByAge(aged, "dec")).toHaveLength(3);
  });
});
