import { describe, expect, it } from "vitest";
import { pendingSuspenseKeys, suspenseKeysFromFiles, suspenseTitle } from "./suspense";

describe("servicing suspense", () => {
  it("auto-opens ID and AOR only when those slots are empty", () => {
    expect(suspenseKeysFromFiles([{ docType: "policy_dec" }])).toEqual(["id_card", "aor"]);
    expect(
      suspenseKeysFromFiles([
        { docType: "policy_dec" },
        { docType: "policy_id" },
      ]),
    ).toEqual(["aor"]);
    expect(
      suspenseKeysFromFiles([
        { docType: "policy_id" },
        { docType: "aor" },
      ]),
    ).toEqual([]);
  });

  it("does not open a second task when Elena AOR is already collected", () => {
    const pending = pendingSuspenseKeys(
      [{ docType: "policy_dec" }, { docType: "policy_id" }],
      [
        {
          id: "t1",
          kind: "servicing_aor",
          title: "Collect AOR packet · HO3-ELENA-2026",
          status: "open",
        },
      ],
    );
    expect(pending).toEqual([]);
    expect(suspenseTitle("aor", "HO3-ELENA-2026")).toContain("AOR packet missing");
    expect(suspenseTitle("id_card", "HP-FL-88421")).toContain("ID cards missing");
  });
});
