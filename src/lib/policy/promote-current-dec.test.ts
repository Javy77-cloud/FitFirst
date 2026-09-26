import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  arrivingDeclarationBecomesCurrent,
  issueFillShouldPromoteCurrent,
  soleLinkedPolicyId,
} from "@/lib/policy/promote-current-dec";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("arrivingDeclarationBecomesCurrent", () => {
  it("treats issued declaration types as the new Current page", () => {
    for (const docType of ["dec", "declaration", "policy_dec", "current_policy", "declarations"]) {
      expect(arrivingDeclarationBecomesCurrent(docType), docType).toBe(true);
    }
  });

  it("leaves AOR packets, id cards, endorsements, and quotes off the Current page", () => {
    for (const docType of [
      "aor",
      "AOR",
      "policy_complete",
      "policy_id",
      "endorsement",
      "inspection",
      "coi",
      "renewal_docs",
      "roof_docs",
      "loss_runs",
      "quote_pdf",
      "binder",
      "other",
      "",
    ]) {
      expect(arrivingDeclarationBecomesCurrent(docType), docType).toBe(false);
    }
  });
});

describe("soleLinkedPolicyId", () => {
  it("returns the only policy and refuses to guess among several", () => {
    expect(soleLinkedPolicyId(["p1"])).toBe("p1");
    expect(soleLinkedPolicyId(["p1", "p1"])).toBe("p1");
    expect(soleLinkedPolicyId([])).toBeNull();
    expect(soleLinkedPolicyId(["p1", "p2"])).toBeNull();
    expect(soleLinkedPolicyId([null, "  "])).toBeNull();
  });
});

describe("issueFillShouldPromoteCurrent", () => {
  it("promotes an untagged or current page and keeps a future or prior page off Current", () => {
    expect(issueFillShouldPromoteCurrent(null)).toBe(true);
    expect(issueFillShouldPromoteCurrent("")).toBe(true);
    expect(issueFillShouldPromoteCurrent("current")).toBe(true);
    expect(issueFillShouldPromoteCurrent("renewal")).toBe(false);
    expect(issueFillShouldPromoteCurrent("prior")).toBe(false);
    expect(issueFillShouldPromoteCurrent("archive")).toBe(false);
  });
});

describe("current declaration promotion wiring", () => {
  it("routes issue, upload, API, and the Current control through one promoter", () => {
    const promote = source("src/lib/policy/promote-current-dec.ts");
    expect(promote).toMatch(/export async function promoteArrivingCurrentDec/);
    expect(promote).toMatch(/markPolicyDecAsCurrent/);
    expect(promote).toMatch(/advanceTerm/);
    expect(promote).toMatch(/syncPolicyDateAutomations/);
    expect(promote).not.toMatch(/status:\s*"archived"/);

    const issued = source("src/lib/policies/apply-issued-term.ts");
    expect(issued).toMatch(/promoteArrivingCurrentDec/);
    expect(issued).toMatch(/advanceTerm:\s*false/);
    expect(issued).toMatch(/tagDocumentTermRoleOnly/);
    expect(issued).not.toMatch(/plan\.documentRole === "current" && currentRole === "current"/);

    const fill = source("src/app/actions/policy-fill-from-dec.ts");
    const onIssue = fill.slice(fill.indexOf("export async function fillPolicyFromDecOnIssue"));
    expect(onIssue).toMatch(/issueFillShouldPromoteCurrent/);
    expect(onIssue).toMatch(/promoteArrivingCurrentDec/);
    expect(onIssue.indexOf("promoteArrivingCurrentDec")).toBeLessThan(onIssue.indexOf("fillPolicyFromDec({"));
    expect(onIssue).toMatch(/advanceTerm:\s*false/);
    expect(fill).toMatch(/source === "manual"/);
    expect(fill).toMatch(/promoteArrivingCurrentDec/);

    const declaration = source("src/app/actions/declaration.ts");
    expect(declaration).toMatch(/promoteSoleDealPolicyDeclaration/);
    expect(declaration).toMatch(/tagsWithTermRole\(\["dec", "mint", "source:carrier"\], "current"\)/);

    const files = source("src/app/actions/policy-files.ts");
    expect(files).toMatch(/arrivingDeclarationBecomesCurrent/);
    const attach = files.slice(files.indexOf("export async function attachPolicyFiles"));
    const blob = files.slice(files.indexOf("export async function savePolicyDocumentFromBlob"));
    expect(attach.indexOf("promoteArrivingCurrentDec")).toBeGreaterThan(-1);
    expect(attach.indexOf("promoteArrivingCurrentDec")).toBeLessThan(attach.indexOf("export async function preparePolicyBlobUpload"));
    expect(blob.indexOf("promoteArrivingCurrentDec")).toBeGreaterThan(-1);

    const lifecycle = source("src/app/actions/lifecycle.ts");
    const slot = lifecycle.slice(lifecycle.indexOf("export async function uploadDealSlot"));
    expect(slot).toMatch(/arrivingDeclarationBecomesCurrent/);
    expect(slot).toMatch(/promoteArrivingCurrentDec/);

    const docs = source("src/app/actions/documents.ts");
    const term = docs.slice(docs.indexOf("export async function setDocumentTermRole"));
    const inline = docs.slice(docs.indexOf("export async function setDocumentTermRoleInline"));
    expect(term).toMatch(/promoteArrivingCurrentDec/);
    expect(term).toMatch(/advanceTerm:\s*true/);
    expect(inline).toMatch(/promoteArrivingCurrentDec/);
    expect(inline).toMatch(/if \(!promoted\.ok\) \{\s*return \{ ok: false, error: promoted\.error \}/);
  });
});
