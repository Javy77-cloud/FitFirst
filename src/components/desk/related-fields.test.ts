import { describe, expect, it } from "vitest";
import { resolveAssigneeSelectValue } from "./related-fields";

describe("resolveAssigneeSelectValue", () => {
  const users = [
    { id: "75adb983-1111-2222-3333-444444444444", name: "Javy" },
    { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", name: "Broker" },
  ];

  it("selects the user when activities.assignee is a user id", () => {
    expect(resolveAssigneeSelectValue(users[0].id, users)).toBe(users[0].id);
  });

  it("selects the user when activities.assignee is a legacy display name", () => {
    expect(resolveAssigneeSelectValue("Broker", users)).toBe(users[1].id);
  });

  it("returns empty when assignee is missing or unknown", () => {
    expect(resolveAssigneeSelectValue(null, users)).toBe("");
    expect(resolveAssigneeSelectValue("Nobody", users)).toBe("");
  });
});
