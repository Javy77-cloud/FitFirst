import { describe, expect, it } from "vitest";
import { filterSuspenseBoard, openSuspenseCount, sortSuspenseBoard } from "./suspense-board";

describe("agency suspense board", () => {
  const rows = [
    {
      taskId: "hale-id",
      policyId: "hale",
      policyNumber: "HP-FL-88421",
      partyName: "Hale, Jordan",
      docKey: "id_card" as const,
      title: "Collect ID cards · HP-FL-88421",
      dueDate: new Date("2026-09-18T16:00:00.000Z"),
      status: "open",
    },
    {
      taskId: "elena-aor",
      policyId: "elena",
      policyNumber: "HO3-ELENA-2026",
      partyName: "Ruiz, Elena",
      docKey: "aor" as const,
      title: "Collect AOR packet · HO3-ELENA-2026",
      dueDate: new Date("2026-09-12T16:00:00.000Z"),
      status: "open",
    },
    {
      taskId: "hale-aor",
      policyId: "hale",
      policyNumber: "HP-FL-88421",
      partyName: "Hale, Jordan",
      docKey: "aor" as const,
      title: "Collect AOR packet · HP-FL-88421",
      dueDate: new Date("2026-09-18T16:00:00.000Z"),
      status: "open",
    },
  ];

  it("filters Elena AOR and Hale ID/AOR without opening dec", () => {
    const aor = filterSuspenseBoard(rows, "aor");
    expect(aor.map((row) => row.taskId)).toEqual(["elena-aor", "hale-aor"]);
    expect(filterSuspenseBoard(rows, "dec")).toHaveLength(3);
    expect(openSuspenseCount(rows)).toBe(3);
  });

  it("sorts by due date then policy number", () => {
    expect(sortSuspenseBoard(rows).map((row) => row.taskId)).toEqual([
      "elena-aor",
      "hale-aor",
      "hale-id",
    ]);
  });
});
