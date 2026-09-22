import { describe, expect, it } from "vitest";
import { pendingSuspenseKeys, suspenseKeysFromFiles, suspenseTitle } from "./suspense";

describe("servicing suspense", () => {
  it("does not auto-open ID or AOR suspense on policy create", () => {
    expect(suspenseKeysFromFiles([{ docType: "policy_dec" }])).toEqual([]);
    expect(
      suspenseKeysFromFiles([
        { docType: "policy_dec" },
        { docType: "policy_id" },
      ]),
    ).toEqual([]);
  });

  it("keeps suspense title helpers for manually started flows", () => {
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
