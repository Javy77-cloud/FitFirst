import { describe, expect, it } from "vitest";
import { filterDeskTaskRows, groupDeskTaskRows, mergeDeskTaskRows } from "./desk-list";

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

  it("wires policy display name and number from names map", () => {
    const rows = mergeDeskTaskRows({
      review: [
        {
          id: "rev-pol",
          title: "Renewal compare",
          dueDate: new Date("2026-09-10T16:00:00.000Z"),
          status: "open",
          kind: "renewal",
          policyId: "p1",
        },
      ],
      activities: [],
      names: {
        contacts: new Map(),
        accounts: new Map(),
        policies: new Map([
          ["p1", { name: "Elena Hale / Citizens / HO3 / HP-FL-88421", number: "HP-FL-88421" }],
        ]),
        deals: new Map(),
        leads: new Map(),
      },
    });
    expect(rows[0]?.recordType).toBe("policy");
    expect(rows[0]?.recordName).toBe("Elena Hale / Citizens / HO3 / HP-FL-88421");
    expect(rows[0]?.recordNumber).toBe("HP-FL-88421");
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
          recordType: null,
          recordName: null,
          recordNumber: null,
          policyId: null,
          contactId: null,
          dealId: null,
          accountId: null,
          leadId: null,
          assigneeId: null,
          tags: [],
        },
        {
          id: "b",
          title: "Done item",
          due: new Date("2026-09-01T16:00:00.000Z"),
          status: "done",
          kind: "review",
          source: "review",
          recordType: null,
          recordName: null,
          recordNumber: null,
          policyId: null,
          contactId: null,
          dealId: null,
          accountId: null,
          leadId: null,
          assigneeId: null,
          tags: [],
        },
      ],
      { status: "open" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toContain("Hale HO 30");
  });
});

describe("groupDeskTaskRows", () => {
  it("groups by linked record id, not task row id", () => {
    const base = {
      due: new Date("2026-09-10T16:00:00.000Z"),
      status: "open",
      kind: "work_reminder",
      source: "review" as const,
      recordType: "contact" as const,
      recordName: "Hale",
      recordNumber: null,
      policyId: null,
      dealId: null,
      accountId: null,
      leadId: null,
      assigneeId: null,
      tags: [],
    };
    const sections = groupDeskTaskRows(
      [
        { ...base, id: "t1", title: "A", contactId: "c1" },
        { ...base, id: "t2", title: "B", contactId: "c1" },
        { ...base, id: "t3", title: "C", contactId: "c2", recordName: "Other" },
      ],
      "policy",
    );
    expect(sections).toHaveLength(2);
    expect(sections.find((s) => s.key === "contact:c1")?.rows).toHaveLength(2);
    expect(sections.find((s) => s.key === "contact:c2")?.rows).toHaveLength(1);
  });

  it("regroups by task_type and due", () => {
    const rows = [
      {
        id: "1",
        title: "A",
        due: new Date("2026-09-01T16:00:00.000Z"),
        status: "open",
        kind: "renewal_followup",
        source: "review" as const,
        recordType: null,
        recordName: null,
        recordNumber: null,
        policyId: null,
        contactId: null,
        dealId: null,
        accountId: null,
        leadId: null,
        assigneeId: null,
        tags: [],
      },
      {
        id: "2",
        title: "B",
        due: new Date("2099-01-01T16:00:00.000Z"),
        status: "open",
        kind: "claim_followup",
        source: "review" as const,
        recordType: null,
        recordName: null,
        recordNumber: null,
        policyId: null,
        contactId: null,
        dealId: null,
        accountId: null,
        leadId: null,
        assigneeId: null,
        tags: [],
      },
    ];
    const byType = groupDeskTaskRows(rows, "task_type");
    expect(byType.map((s) => s.key).sort()).toEqual(["claim_followup", "renewal_followup"]);
    const byDue = groupDeskTaskRows(rows, "due", new Date("2026-09-13T12:00:00.000Z"));
    expect(byDue.some((s) => s.key === "overdue")).toBe(true);
    expect(byDue.some((s) => s.key === "later")).toBe(true);
  });

  it("group-by-policy headers use recordName (display name)", () => {
    const rows = [
      {
        id: "t1",
        title: "Shop renewal",
        due: new Date("2026-09-10T16:00:00.000Z"),
        status: "open",
        kind: "renewal_followup",
        source: "review" as const,
        recordType: "policy" as const,
        recordName: "Elena Hale / Citizens / HO3 / HP-FL-88421",
        recordNumber: "HP-FL-88421",
        policyId: "p1",
        contactId: null,
        dealId: null,
        accountId: null,
        leadId: null,
        assigneeId: null,
        tags: [],
      },
      {
        id: "t2",
        title: "Call insured",
        due: new Date("2026-09-11T16:00:00.000Z"),
        status: "open",
        kind: "work_reminder",
        source: "review" as const,
        recordType: "policy" as const,
        recordName: "Elena Hale / Citizens / HO3 / HP-FL-88421",
        recordNumber: "HP-FL-88421",
        policyId: "p1",
        contactId: null,
        dealId: null,
        accountId: null,
        leadId: null,
        assigneeId: null,
        tags: [],
      },
    ];
    const sections = groupDeskTaskRows(rows, "policy");
    expect(sections).toHaveLength(1);
    expect(sections[0]?.key).toBe("policy:p1");
    expect(sections[0]?.label).toBe("Elena Hale / Citizens / HO3 / HP-FL-88421");
    expect(sections[0]?.rows).toHaveLength(2);
  });
});
