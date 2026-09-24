import { describe, expect, it } from "vitest";
import {
  applyOrphanLink,
  commitmentEntityHref,
  commitmentHasEntity,
  commitmentHeat,
  commitmentRecordType,
  commitmentsForEntity,
  isHotCommitment,
  matchOrphanToName,
  shouldNudgeCommitment,
} from "./commitments";

const asOf = new Date("2026-09-19T13:00:00.000Z");

describe("commitments dissolve into entities", () => {
  it("opens the linked record, never a void task form", () => {
    expect(commitmentEntityHref({ dealId: "d1", contactId: "c1" })).toBe("/deals/d1");
    expect(commitmentEntityHref({ policyId: "p1" })).toBe("/policies/p1");
    expect(commitmentEntityHref({ contactId: "c1" })).toBe("/contacts/c1");
    expect(commitmentEntityHref({ accountId: "a1" })).toBe("/accounts/a1");
    expect(commitmentEntityHref({ leadId: "l1" })).toBe("/leads/l1");
    expect(commitmentEntityHref({})).toBe("/notifications#commitments");
  });

  it("marks orphans until a contact, deal, policy, lead, or account is linked", () => {
    expect(commitmentHasEntity({ title: "Call" } as never)).toBe(false);
    expect(commitmentHasEntity({ contactId: "c1" })).toBe(true);
    expect(commitmentRecordType({ dealId: "d1" })).toBe("deal");
  });

  it("attaches an orphan when the title uniquely names one record", () => {
    const names = [
      { id: "c1", name: "Elena Ruiz", type: "contact" as const },
      { id: "d1", name: "Harbor Key GL", type: "deal" as const },
    ];
    expect(matchOrphanToName("Call Elena Ruiz Friday", names)).toEqual({ id: "c1", type: "contact" });
    expect(matchOrphanToName("Follow up", names)).toBeNull();
    expect(
      applyOrphanLink({ title: "Call Elena Ruiz Friday", contactId: null as string | null }, { id: "c1", type: "contact" }),
    ).toEqual({
      title: "Call Elena Ruiz Friday",
      contactId: "c1",
    });
  });

  it("expands the timeline only for overdue or due-soon heat", () => {
    expect(commitmentHeat(new Date("2026-09-18T13:00:00.000Z"), asOf)).toBe("overdue");
    expect(commitmentHeat(new Date("2026-09-20T12:00:00.000Z"), asOf)).toBe("due_soon");
    expect(commitmentHeat(new Date("2026-09-25T13:00:00.000Z"), asOf)).toBe("later");
    expect(isHotCommitment("later")).toBe(false);
    expect(isHotCommitment("due_soon")).toBe(true);
    expect(shouldNudgeCommitment(new Date("2026-09-25T13:00:00.000Z"), asOf)).toBe(false);
    expect(shouldNudgeCommitment(new Date("2026-09-19T10:00:00.000Z"), asOf)).toBe(true);
  });

  it("chips only the promises on that contact or deal", () => {
    const rows = [
      {
        id: "1",
        source: "review" as const,
        title: "Call Friday",
        dueAt: asOf,
        status: "open",
        kind: "work_reminder",
        priority: null,
        heat: "due_soon" as const,
        contactId: "c1",
        dealId: "d1",
        policyId: null,
        leadId: null,
        accountId: null,
        recordType: "deal" as const,
        recordName: "Elena",
        href: "/deals/d1",
        orphan: false,
      },
      {
        id: "2",
        source: "review" as const,
        title: "Other",
        dueAt: asOf,
        status: "open",
        kind: "work_reminder",
        priority: null,
        heat: "later" as const,
        contactId: "c2",
        dealId: "d2",
        policyId: null,
        leadId: null,
        accountId: null,
        recordType: "deal" as const,
        recordName: "Other",
        href: "/deals/d2",
        orphan: false,
      },
    ];
    expect(commitmentsForEntity(rows, { dealId: "d1" }).map((row) => row.id)).toEqual(["1"]);
    expect(commitmentsForEntity(rows, { contactId: "c1" }).map((row) => row.id)).toEqual(["1"]);
  });
});
