import { describe, expect, it } from "vitest";
import { activityHref, groupOpenActivities, personKey } from "./record-context-types";

describe("record context helpers", () => {
  it("routes meetings to /meetings and other kinds to /tasks", () => {
    expect(activityHref("meeting", "m1")).toBe("/meetings/m1");
    expect(activityHref("task", "t1")).toBe("/tasks/t1");
    expect(activityHref("call", "c1")).toBe("/tasks/c1");
  });

  it("groups open activities in desk kind order", () => {
    const grouped = groupOpenActivities([
      { id: "1", kind: "call", title: "Dial", href: "/tasks/1", when: null },
      { id: "2", kind: "task", title: "Follow", href: "/tasks/2", when: null },
      { id: "3", kind: "meeting", title: "Review", href: "/meetings/3", when: null },
      { id: "4", kind: "email", title: "Ping", href: "/tasks/4", when: null },
      { id: "5", kind: "sms", title: "Text", href: "/tasks/5", when: null },
    ]);
    expect(grouped.map((g) => g.kind)).toEqual(["task", "meeting", "call", "email", "sms"]);
    expect(grouped.find((g) => g.kind === "task")?.items).toHaveLength(1);
    expect(grouped.find((g) => g.kind === "call")?.items).toHaveLength(1);
    expect(grouped.find((g) => g.kind === "email")?.items).toHaveLength(1);
    expect(grouped.find((g) => g.kind === "sms")?.items).toHaveLength(1);
  });

  it("keeps the full activity set when the record has none open", () => {
    const grouped = groupOpenActivities([]);
    expect(grouped.map((g) => [g.kind, g.items.length])).toEqual([
      ["task", 0],
      ["meeting", 0],
      ["call", 0],
      ["email", 0],
      ["sms", 0],
    ]);
  });

  it("keys people by record type", () => {
    expect(personKey("contact", "c")).toBe("contact:c");
    expect(personKey("lead", "l")).toBe("lead:l");
  });
});
