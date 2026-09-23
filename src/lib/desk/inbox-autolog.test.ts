import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  mailMessageOccurredAt,
  mailMessageSourceId,
  preferEmailThreadAssignee,
} from "./inbox-autolog";

describe("inbox autolog helpers", () => {
  it("prefers prior thread agent over contact owner collision", () => {
    expect(
      preferEmailThreadAssignee({
        priorAssigneeId: "agent-sender",
        priorCreatedById: null,
        mailboxOwnerUserId: "mailbox-owner",
        sessionUserId: "viewer",
      }),
    ).toBe("agent-sender");
    expect(
      preferEmailThreadAssignee({
        priorAssigneeId: null,
        priorCreatedById: "creator",
        mailboxOwnerUserId: "mailbox-owner",
        sessionUserId: "viewer",
      }),
    ).toBe("creator");
    expect(
      preferEmailThreadAssignee({
        priorAssigneeId: null,
        priorCreatedById: null,
        mailboxOwnerUserId: null,
        sessionUserId: "viewer",
      }),
    ).toBe("viewer");
  });

  it("builds source ids and prefers Gmail internalDate", () => {
    expect(mailMessageSourceId("gmail", "msg-9")).toBe("gmail:msg:msg-9");
    expect(mailMessageOccurredAt({ internalDate: 1_700_000_000_000, date: "Mon, 1 Jan 2024" }).getTime()).toBe(
      1_700_000_000_000,
    );
  });

  it("wires inbox load + send paths to autolog", () => {
    expect(readFileSync("src/lib/desk/inbox-engine.ts", "utf8")).toMatch(/ensureMatchedThreadLogged/);
    expect(readFileSync("src/app/actions/inbox.ts", "utf8")).toMatch(/ensureMatchedThreadLogged/);
    expect(readFileSync("src/app/actions/inbox.ts", "utf8")).toMatch(/stampThreadEmailAssignee/);
    expect(readFileSync("src/app/actions/comms.ts", "utf8")).toMatch(/assignee: actorId/);
    expect(readFileSync("src/lib/desk/write-comms.ts", "utf8")).toMatch(/createdByUserId: input.actorId/);
  });
});
