import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "@/lib/home/as-of";
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

  it("scores Elena: dec + ID complete, mortgagee/inspection open, renewal not yet due", () => {
    const checklist = buildServicingChecklist({
      files: [
        { docType: "policy_dec", slot: "policy_file" },
        { docType: "policy_id", slot: "policy_file" },
      ],
      expirationDate: "2027-09-01",
      nextTask: { id: "t1", title: "Servicing · Mortgagee · HO3-ELENA-2026", dueDate: "2026-09-12" },
      checks: [
        { key: "id_cards", status: "complete" },
        { key: "renewal_docs", status: "complete" },
        { key: "inspection", status: "incomplete" },
        { key: "mortgagee", status: "incomplete", taskId: "t1" },
      ],
      asOf: DESK_AS_OF,
    });
    expect(checklist.items.find((item) => item.key === "id_cards")?.ok).toBe(true);
    expect(checklist.items.find((item) => item.key === "renewal_docs")?.ok).toBe(true);
    expect(checklist.items.find((item) => item.key === "mortgagee")?.ok).toBe(false);
    expect(checklist.items.find((item) => item.key === "inspection")?.ok).toBe(false);
    expect(checklist.items.find((item) => item.key === "mortgagee")?.taskId).toBe("t1");
    expect(checklist.missingCount).toBe(2);
  });

  it("flags Hale renewal docs as due inside 30 days until marked complete", () => {
    const open = buildServicingChecklist({
      files: [],
      expirationDate: "2026-10-01",
      nextTask: null,
      checks: [{ key: "renewal_docs", status: "incomplete" }],
      asOf: DESK_AS_OF,
    });
    expect(open.items.find((item) => item.key === "renewal_docs")?.ok).toBe(false);
    expect(open.items.find((item) => item.key === "renewal_docs")?.detail).toContain("Due");

    const done = buildServicingChecklist({
      files: [],
      expirationDate: "2026-10-01",
      nextTask: null,
      checks: [{ key: "renewal_docs", status: "complete" }],
      asOf: DESK_AS_OF,
    });
    expect(done.items.find((item) => item.key === "renewal_docs")?.ok).toBe(true);
  });

  it("flags an empty servicing packet", () => {
    const checklist = buildServicingChecklist({
      files: [],
      expirationDate: null,
      nextTask: null,
    });
    expect(checklist.readyCount).toBe(0);
    expect(checklist.missingCount).toBe(6);
  });
});
