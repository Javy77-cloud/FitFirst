import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DOCUMENT_TERM_ROLES,
  POLICY_ATTACH_DOC_TYPES,
  displayDocumentTags,
  isPolicyAttachDocType,
  tagsWithTermRole,
  termRoleFromTags,
  termRoleLabel,
} from "./document-labels";

describe("document labels + term role", () => {
  it("exposes Policy Documents attach types with Issued declaration page first", () => {
    expect(POLICY_ATTACH_DOC_TYPES.map((row) => row.value)).toEqual([
      "policy_dec",
      "policy_complete",
      "policy_id",
      "endorsement",
      "application",
      "binder",
      "aor",
      "coi",
      "inspection",
    ]);
    expect(POLICY_ATTACH_DOC_TYPES[0]?.label).toBe("Issued declaration page");
    expect(isPolicyAttachDocType("aor")).toBe(true);
    expect(isPolicyAttachDocType("dec")).toBe(false);
  });

  it("stores term role on tags without dropping other tags", () => {
    expect(termRoleFromTags(["dec", "term_role:prior"])).toBe("prior");
    expect(termRoleLabel("renewal")).toBe("Renewal / upcoming term");
    expect(tagsWithTermRole(["dec", "term_role:prior"], "renewal")).toEqual([
      "dec",
      "term_role:renewal",
    ]);
    expect(tagsWithTermRole(["dec", "term_role:current"], null)).toEqual(["dec"]);
    expect(displayDocumentTags(["dec", "term_role:prior"])).toEqual(["dec"]);
    expect(DOCUMENT_TERM_ROLES.map((r) => r.value)).toEqual(["prior", "current", "renewal"]);
  });

  it("wires rename / type / term-role server actions in documents.ts", () => {
    const text = readFileSync("src/app/actions/documents.ts", "utf8");
    expect(text).toMatch(/export async function renameUploadedFile/);
    expect(text).toMatch(/export async function updateDocumentLabel/);
    expect(text).toMatch(/export async function setDocumentTermRole/);
    expect(text).toMatch(/tagsWithTermRole/);
    expect(text).toMatch(/revalidateDocumentPaths\(doc\)/);
  });
});
