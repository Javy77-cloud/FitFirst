import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "@/lib/home/as-of";
import {
  buildServicingChecklist,
  hasServicingDoc,
  missingServicingDocs,
  optionalExtraPacketKeys,
  servicingPacketOnFile,
} from "./checklist";
import { CHECKLIST_DOC_KEYS_BY_LOB } from "./checklist-templates";

describe("servicing checklist", () => {
  it("treats issued dec / complete / mint aliases as on-file for Dec", () => {
    expect(hasServicingDoc([{ docType: "policy_dec", slot: "policy_file" }], "dec")).toBe(true);
    expect(hasServicingDoc([{ docType: "policy_complete" }], "dec")).toBe(true);
    expect(hasServicingDoc([{ docType: "current_policy" }], "dec")).toBe(true);
    expect(hasServicingDoc([{ docType: "dec" }], "dec")).toBe(true);
    expect(hasServicingDoc([{ docType: "policy_id", slot: "policy_file" }], "id_card")).toBe(true);
    expect(hasServicingDoc([{ docType: "dec", slot: "source_doc" }], "aor")).toBe(false);
  });

  it("never auto-requires AOR or ID cards on policy create", () => {
    for (const keys of Object.values(CHECKLIST_DOC_KEYS_BY_LOB)) {
      expect(keys).toEqual(["dec"]);
      expect(keys).not.toContain("aor");
      expect(keys).not.toContain("id_card");
    }
    expect(missingServicingDocs([])).toEqual(["dec"]);
    expect(missingServicingDocs([{ docType: "current_policy" }], "PA")).toEqual([]);
    expect(missingServicingDocs([{ docType: "policy_dec" }], "HO3")).toEqual([]);
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

  it("flags Hale renewal docs as due inside 30 days until the file is attached", () => {
    const open = buildServicingChecklist({
      files: [],
      expirationDate: "2026-10-01",
      nextTask: null,
      checks: [{ key: "renewal_docs", status: "complete" }],
      asOf: DESK_AS_OF,
    });
    const due = open.items.find((item) => item.key === "renewal_docs");
    expect(due?.ok).toBe(false);
    expect(due?.toggleable).toBe(false);
    expect(due?.attachDocType).toBe("renewal_docs");
    expect(due?.detail).toContain("Due");

    const done = buildServicingChecklist({
      files: [{ docType: "renewal_docs" }],
      expirationDate: "2026-10-01",
      nextTask: null,
      checks: [{ key: "renewal_docs", status: "incomplete" }],
      asOf: DESK_AS_OF,
    });
    const filed = done.items.find((item) => item.key === "renewal_docs");
    expect(filed?.ok).toBe(true);
    expect(filed?.onFile).toBe(true);
  });

  it("derives upload-backed rows from files and leaves non-file checks manual", () => {
    const marked = buildServicingChecklist({
      files: [],
      expirationDate: "2027-09-01",
      nextTask: null,
      checks: [
        { key: "id_cards", status: "complete" },
        { key: "inspection", status: "complete" },
        { key: "mortgagee", status: "complete" },
      ],
      asOf: DESK_AS_OF,
    });
    expect(marked.items.find((item) => item.key === "id_cards")).toMatchObject({
      ok: false,
      toggleable: false,
      attachDocType: "policy_id",
    });
    expect(marked.items.find((item) => item.key === "inspection")).toMatchObject({
      ok: false,
      toggleable: false,
      attachDocType: "inspection",
    });
    expect(marked.items.find((item) => item.key === "mortgagee")).toMatchObject({
      ok: false,
      toggleable: false,
      attachDocType: "endorsement",
    });
    expect(marked.items.find((item) => item.key === "dec")?.attachDocType).toBe("policy_dec");
    expect(marked.items.find((item) => item.key === "renewal_docs")?.ok).toBe(true);
    expect(marked.items.find((item) => item.key === "renewal_docs")?.onFile).toBe(false);

    const filed = buildServicingChecklist({
      files: [
        { docType: "policy_id" },
        { docType: "inspection" },
        { docType: "endorsement" },
      ],
      expirationDate: "2027-09-01",
      nextTask: null,
      asOf: DESK_AS_OF,
    });
    expect(filed.items.find((item) => item.key === "id_cards")?.ok).toBe(true);
    expect(filed.items.find((item) => item.key === "inspection")?.ok).toBe(true);
    expect(filed.items.find((item) => item.key === "mortgagee")?.ok).toBe(true);

    const life = buildServicingChecklist({
      files: [],
      expirationDate: null,
      nextTask: null,
      lineOfBusiness: "LIFE",
      checks: [{ key: "beneficiary", status: "incomplete" }],
      asOf: DESK_AS_OF,
    });
    expect(life.items.find((item) => item.key === "beneficiary")?.toggleable).toBe(true);
    expect(life.items.find((item) => item.key === "beneficiary")?.attachDocType).toBeUndefined();
    expect(life.items.find((item) => item.key === "medical_exam")?.toggleable).toBe(true);
    expect(life.items.find((item) => item.key === "underwriting")?.toggleable).toBe(true);

    const commercial = buildServicingChecklist({
      files: [{ docType: "coi" }, { docType: "endorsement" }],
      expirationDate: null,
      nextTask: null,
      lineOfBusiness: "GL",
      asOf: DESK_AS_OF,
    });
    expect(commercial.items.find((item) => item.key === "coi")).toMatchObject({
      ok: true,
      toggleable: false,
      attachDocType: "coi",
    });
    expect(commercial.items.find((item) => item.key === "ai_endorsements")).toMatchObject({
      ok: true,
      toggleable: false,
      attachDocType: "endorsement",
    });
    expect(commercial.items.find((item) => item.key === "loss_runs")?.toggleable).toBe(true);

    const home = buildServicingChecklist({
      files: [],
      expirationDate: null,
      nextTask: null,
      lineOfBusiness: "HO3",
      asOf: DESK_AS_OF,
    });
    expect(home.items.find((item) => item.key === "roof_docs")?.toggleable).toBe(true);
    expect(home.items.find((item) => item.key === "roof_docs")?.attachDocType).toBeUndefined();
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

  it("keeps AOR optional and accurate on-file for Auto checklist extras", () => {
    const checklist = buildServicingChecklist({
      files: [{ docType: "policy_dec" }],
      expirationDate: "2027-09-01",
      nextTask: null,
      lineOfBusiness: "PA",
      asOf: DESK_AS_OF,
    });
    expect(checklist.items.map((item) => item.key)).not.toContain("aor");
    expect(missingServicingDocs([{ docType: "policy_dec" }], "PA")).toEqual([]);
    expect(optionalExtraPacketKeys(checklist.items.map((item) => item.key))).toEqual(["aor"]);
    expect(servicingPacketOnFile([{ docType: "policy_dec" }])).toEqual({
      dec: true,
      id_card: false,
      aor: false,
    });
    expect(servicingPacketOnFile([{ docType: "policy_dec" }, { docType: "aor" }]).aor).toBe(true);
  });

  it("does not surface a duplicate ID packet row when id_cards check is listed", () => {
    const checklist = buildServicingChecklist({
      files: [],
      expirationDate: null,
      nextTask: null,
      lineOfBusiness: "PA",
      asOf: DESK_AS_OF,
    });
    expect(checklist.items.some((item) => item.key === "id_cards")).toBe(true);
    expect(optionalExtraPacketKeys(checklist.items.map((item) => item.key))).toEqual(["aor"]);
  });

});
