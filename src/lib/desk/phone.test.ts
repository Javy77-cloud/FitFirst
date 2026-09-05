import { describe, expect, it } from "vitest";
import { formatCallOutcome, isCallOutcome, phoneLineWallCopy } from "./phone";

describe("phone setup wall", () => {
  it("uses a connect wall when no BYO line is marked", () => {
    const wall = phoneLineWallCopy({
      connected: false,
      providerLabel: "Not connected",
      displayFrom: null,
    });
    expect(wall.title).toBe("Connect your phone line");
    expect(wall.body).toMatch(/Bring your own/i);
    expect(wall.body).toMatch(/does not buy numbers/i);
  });

  it("still refuses a live trunk when a preferred line is marked", () => {
    const wall = phoneLineWallCopy({
      connected: true,
      providerLabel: "Bring-your-own SIP / trunk",
      displayFrom: "(321) 555-0100",
    });
    expect(wall.title).toBe("Line marked — not live");
    expect(wall.body).toMatch(/Twilio is not wired/i);
    expect(isCallOutcome("no_answer")).toBe(true);
    expect(isCallOutcome("hangup")).toBe(false);
    expect(formatCallOutcome("no_answer")).toBe("no answer");
  });
});
