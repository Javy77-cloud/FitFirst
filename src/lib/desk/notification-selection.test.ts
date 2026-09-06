import { describe, expect, it } from "vitest";
import {
  canRunNotificationBulk,
  emptyNotificationSelection,
  selectAllNotifications,
  selectedNotificationIds,
  toggleNotificationSelection,
} from "./notification-selection";

describe("notification list checkboxes", () => {
  it("starts unchecked and only toggles from the checkbox", () => {
    expect(emptyNotificationSelection()).toEqual([]);
    expect(selectAllNotifications(["a", "b"], false)).toEqual([]);
    const one = toggleNotificationSelection([], "a");
    expect(one).toEqual(["a"]);
    expect(toggleNotificationSelection(one, "a")).toEqual([]);
    expect(canRunNotificationBulk([])).toBe(false);
    expect(canRunNotificationBulk(["a"])).toBe(true);
    expect(selectedNotificationIds(["ghost", "a"], ["a", "b"])).toEqual(["a"]);
  });
});
