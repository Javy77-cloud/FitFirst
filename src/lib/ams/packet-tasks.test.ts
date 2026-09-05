import { describe, expect, it } from "vitest";
import { canCreatePacketTask, openPacketTask, packetTaskTitle } from "./packet-tasks";

describe("packet checklist tasks", () => {
  it("titles Elena AOR as the missing-packet seed proof", () => {
    expect(packetTaskTitle("aor", "HO3-ELENA-2026")).toBe(
      "Collect AOR packet · HO3-ELENA-2026",
    );
  });

  it("creates a task only when the slot is missing and no open task exists", () => {
    const open = [
      { id: "t1", kind: "servicing_aor", title: "Collect AOR packet · HO3-ELENA-2026", status: "open" },
    ];
    expect(canCreatePacketTask(["aor"], [], "aor")).toBe(true);
    expect(canCreatePacketTask(["aor"], open, "aor")).toBe(false);
    expect(canCreatePacketTask(["dec"], open, "aor")).toBe(false);
    expect(openPacketTask(open, "aor")?.id).toBe("t1");
  });
});
