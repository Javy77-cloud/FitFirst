import { describe, expect, it } from "vitest";
import { filterDeskTaskRows, mergeDeskTaskRows } from "./desk-list";

describe("mergeDeskTaskRows", () => {
  it("puts playbook activity tasks on the same list as review tasks", () => {
    const rows = mergeDeskTaskRows({
      review: [
        {
          id: "rev-1",
          title: "Renewal compare · Hale",
          dueDate: new Date("2026-09-10T16:00:00.000Z"),
          status: "open",
          kind: "renewal",
        },
      ],
      activities: [
        {
          id: "act-60",
          title: "Shop this renewal 60 days out",
          dueAt: new Date("2026-09-10T16:00:00.000Z"),
          startAt: new Date("2026-09-03T16:00:00.000Z"),
          status: "open",
          kind: "task",
        },
      ],
    });
    expect(rows.map((row) => row.title)).toEqual([
      "Renewal compare · Hale",
      "Shop this renewal 60 days out",
    ]);
    expect(rows[1]?.source).toBe("activity");
    expect(rows[1]?.id).toBe("act-60");
  });
});

describe("filterDeskTaskRows", () => {
  it("keeps an open playbook task when status=open", () => {
    const rows = filterDeskTaskRows(
      [
        {
          id: "a",
          title: "Shop Hale HO 30 days out — Heritage compare is up",
          due: new Date("2026-09-10T16:00:00.000Z"),
          status: "open",
          kind: "task",
          source: "activity",
        },
        {
          id: "b",
          title: "Done item",
          due: new Date("2026-09-01T16:00:00.000Z"),
          status: "done",
          kind: "review",
          source: "review",
        },
      ],
      { status: "open" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toContain("Hale HO 30");
  });
});
