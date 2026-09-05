import { describe, expect, it } from "vitest";
import { buildServicingChecklist, hasServicingDoc, missingServicingDocs } from "./checklist";

describe("servicing checklist", () => {
  it("treats issued dec / complete / ID / AOR as on-file and ignores shopping decs", () => {
    const files = [
      { docType: "dec", slot: "source_doc" },
      { docType: "policy_dec", slot: "policy_file" },
      { docType: "policy_id", slot: "policy_file" },
    ];
    expect(hasServicingDoc(files, "dec")).toBe(true);
    expect(hasServicingDoc(files, "id_card")).toBe(true);
    expect(hasServicingDoc(files, "aor")).toBe(false);
    expect(missingServicingDocs(files)).toEqual(["aor"]);
  });

  it("scores Elena-shaped files: dec + ID, missing AOR, renewal + task present", () => {
    const checklist = buildServicingChecklist({
      files: [
        { docType: "policy_dec", slot: "policy_file" },
        { docType: "policy_id", slot: "policy_file" },
      ],
      expirationDate: "2027-09-01",
      nextTask: { id: "t1", title: "30-day bind check-in", dueDate: "2026-10-01" },
    });
    expect(checklist.readyCount).toBe(4);
    expect(checklist.missingCount).toBe(1);
    expect(checklist.items.find((item) => item.key === "aor")?.ok).toBe(false);
    expect(checklist.items.find((item) => item.key === "renewal")?.detail).toContain("2027-09-01");
  });

  it("flags an empty servicing packet", () => {
    const checklist = buildServicingChecklist({
      files: [],
      expirationDate: null,
      nextTask: null,
    });
    expect(checklist.readyCount).toBe(0);
    expect(checklist.missingCount).toBe(5);
  });
});
