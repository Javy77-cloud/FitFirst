import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DOCUMENT_TERM_ROLES,
  POLICY_ATTACH_DOC_TYPES,
  displayDocumentTags,
  formatTermLengthMonths,
  isPolicyAttachDocType,
  monthsBetweenTermDates,
  tagsWithTermMonths,
  tagsWithTermRole,
  termMonthsFromTags,
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
      "renewal_docs",
      "roof_docs",
      "loss_runs",
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
    expect(DOCUMENT_TERM_ROLES.map((r) => r.value)).toEqual(["prior", "current", "renewal", "archive"]);
  });

  it("wires rename / type / term-role server actions in documents.ts", () => {
    const text = readFileSync("src/app/actions/documents.ts", "utf8");
    expect(text).toMatch(/export async function renameUploadedFile/);
    expect(text).toMatch(/export async function updateDocumentLabel/);
    expect(text).toMatch(/export async function setDocumentTermRole/);
    expect(text).toMatch(/export async function setDocumentTermRoleInline/);
    expect(text).toMatch(/tagsWithTermRole/);
    expect(text).toMatch(/revalidateDocumentPaths\(doc\)/);
  });

  it("stores term length months on tags and formats labels", () => {
    expect(monthsBetweenTermDates(new Date("2026-10-01T12:00:00Z"), new Date("2027-10-01T12:00:00Z"))).toBe(12);
    expect(monthsBetweenTermDates(new Date("2026-09-21T12:00:00Z"), new Date("2027-03-21T12:00:00Z"))).toBe(6);
    expect(formatTermLengthMonths(12)).toBe("12 months");
    expect(tagsWithTermMonths(["dec", "term_role:prior"], 12)).toEqual([
      "dec",
      "term_role:prior",
      "term_months:12",
    ]);
    expect(termMonthsFromTags(["term_months:12"])).toBe(12);
    expect(displayDocumentTags(["dec", "term_role:prior", "term_months:12"])).toEqual(["dec"]);
  });

  it("exposes Term role column + inline select on Policy Documents table", () => {
    const table = readFileSync("src/components/policy/tabs/documents-table.tsx", "utf8");
    expect(table).toMatch(/>Term role</);
    expect(table).not.toMatch(/<th>Term</);
    expect(table).toMatch(/data-ff-doc-term-role-select/);
    expect(table).toMatch(/setDocumentTermRoleInline/);
    expect(table).toMatch(/DEC expires/);
    expect(table).toMatch(/data-ff-doc-term-length/);
  });
});
