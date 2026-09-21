import { describe, expect, it } from "vitest";
import { mailThreadKey } from "./mail-contract";
import { inboxConnectTarget, listMailProviders } from "./mail-provider";

describe("inbox mail providers", () => {
  it("keeps Gmail as the only live mailbox and leaves Outlook and Yahoo on the same contract", async () => {
    const rows = listMailProviders();
    expect(rows.map((row) => row.id)).toEqual(["gmail", "outlook", "yahoo"]);
    expect(rows.map((row) => row.mailboxLive)).toEqual([true, false, false]);
    expect(inboxConnectTarget().id).toBe("gmail");
    expect(inboxConnectTarget().oauthId).toBe("gmail");
    expect(await rows[1]?.isReady()).toBe(false);
    expect(await rows[2]?.isReady()).toBe(false);
    expect(rows[1]?.markReadReconnectCopy()).toBeNull();
    expect(mailThreadKey("gmail", "t1")).toBe("gmail:t1");
    expect(mailThreadKey("outlook", "t1")).toBe("outlook:t1");
  });
});
