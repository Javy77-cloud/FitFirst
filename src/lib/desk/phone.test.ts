import { describe, expect, it } from "vitest";
import { formatCallOutcome, isCallOutcome, phoneLineWallCopy } from "./phone";

describe("phone setup stub", () => {
  it("uses a connect-later wall when no BYO line is marked", () => {
    const wall = phoneLineWallCopy({
      connected: false,
      providerLabel: "Not connected",
      displayFrom: null,
    });
    expect(wall.title).toBe("Connect a line later");
    expect(wall.body).toMatch(/Bring your own trunk/i);
    expect(wall.body).not.toMatch(/buy/i);
  });

  it("still refuses a live trunk when the stub is marked connected", () => {
    const wall = phoneLineWallCopy({
      connected: true,
      providerLabel: "Bring-your-own SIP / trunk",
      displayFrom: "(321) 555-0100",
    });
    expect(wall.title).toBe("Line marked for later");
    expect(wall.body).toMatch(/does not buy numbers/i);
    expect(isCallOutcome("no_answer")).toBe(true);
    expect(isCallOutcome("hangup")).toBe(false);
    expect(formatCallOutcome("no_answer")).toBe("no answer");
  });
});
