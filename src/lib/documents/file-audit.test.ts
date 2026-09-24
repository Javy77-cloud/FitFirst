import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentFileAuditInput, formatDocumentAuditStamp, restoredStatusFromDeleteMeta } from "./file-audit";
import { orderHiddenDocuments } from "./hidden-files";

const DOC = {
  id: "5ed997ba-21b5-4a70-bdf8-c78810cc79b1",
  filename: "heather-dec.jpg",
  docType: "dec",
  slot: "source_doc",
  status: "extracted",
  contactId: "contact-1",
  accountId: null,
  policyId: null,
  dealId: "deal-1",
  leadId: null,
};

describe("document file audit", () => {
  const at = new Date("2026-09-24T12:08:00.000Z");

  it("records a hide with actor, file, links, and Eastern time", () => {
    const input = documentFileAuditInput({
      action: "doc_delete",
      doc: DOC,
      mode: "hidden",
      actorId: "user-1",
      actorName: "Heather Camirand",
      occurredAt: at,
    });
    expect(input.action).toBe("doc_delete");
    expect(input.occurredAt).toBe(at);
    expect(input.actorId).toBe("user-1");
    expect(input.actorName).toBe("Heather Camirand");
    expect(input.documentId).toBe(DOC.id);
    expect(input.dealId).toBe("deal-1");
    expect(input.contactId).toBe("contact-1");
    expect(input.summary).toBe("Hidden heather-dec.jpg");
    expect(input.meta).toMatchObject({
      filename: "heather-dec.jpg",
      documentId: DOC.id,
      docType: "dec",
      slot: "source_doc",
      mode: "hidden",
      previousStatus: "extracted",
    });
    expect(String(input.meta?.occurredAtEt)).toMatch(/2026/);
    expect(String(input.meta?.occurredAtEt)).toMatch(/ET|EDT|EST/);
    expect(formatDocumentAuditStamp(at)).not.toMatch(/Z$/);
  });

  it("records a restore and puts the prior status back", () => {
    const input = documentFileAuditInput({
      action: "doc_restore",
      doc: DOC,
      mode: "restored",
      actorId: "admin-1",
      actorName: "Javy",
      occurredAt: at,
      extra: { restoredStatus: "extracted" },
    });
    expect(input.action).toBe("doc_restore");
    expect(input.summary).toBe("Restored heather-dec.jpg");
    expect(input.meta).toMatchObject({ mode: "restored", restoredStatus: "extracted" });
    expect(restoredStatusFromDeleteMeta({ previousStatus: "extracted" })).toBe("extracted");
    expect(restoredStatusFromDeleteMeta({ previousStatus: "hidden" })).toBe("uploaded");
    expect(restoredStatusFromDeleteMeta(null)).toBe("uploaded");
  });

  it("audits a genuine purge without pretending the attachment id is a document", () => {
    const input = documentFileAuditInput({
      action: "doc_delete",
      doc: { id: "attach-1", filename: "notice.pdf", docType: "endorsement", slot: "policy_attachment" },
      mode: "hard",
      entityType: "policy_attachment",
      recordAsDocument: false,
    });
    expect(input.documentId).toBeNull();
    expect(input.entityType).toBe("policy_attachment");
    expect(input.entityId).toBe("attach-1");
    expect(input.meta).toMatchObject({ mode: "hard", filename: "notice.pdf" });
  });
});

describe("orderHiddenDocuments", () => {
  it("sorts by hide time, newest first", () => {
    const rows = [
      { id: "old", createdAt: new Date("2026-09-01T12:00:00.000Z") },
      { id: "new", createdAt: new Date("2026-01-01T12:00:00.000Z") },
    ];
    const hiddenAt = new Map<string, Date>([
      ["old", new Date("2026-09-10T12:00:00.000Z")],
      ["new", new Date("2026-09-16T12:08:00.000Z")],
    ]);
    expect(orderHiddenDocuments(rows, hiddenAt).map((row) => row.id)).toEqual(["new", "old"]);
  });
});

describe("remaining purge paths audit before they delete", () => {
  it("policy filing attachments and claim files write doc_delete before the row and blob go", () => {
    const policy = readFileSync("src/lib/policy/service.ts", "utf8");
    const remove = policy.slice(policy.indexOf("export async function removePolicyAttachment"));
    expect(remove.indexOf("writeEoAudit")).toBeGreaterThan(-1);
    expect(remove.indexOf("writeEoAudit")).toBeLessThan(remove.indexOf("db.delete(policyAttachments)"));
    expect(remove.indexOf("writeEoAudit")).toBeLessThan(remove.indexOf("unlink("));
    expect(remove).toMatch(/mode: "hard"/);

    const claims = readFileSync("src/app/actions/claims.ts", "utf8");
    const del = claims.slice(claims.indexOf("export async function deleteClaimAttachment"));
    expect(del.indexOf("writeEoAudit")).toBeGreaterThan(-1);
    expect(del.indexOf("writeEoAudit")).toBeLessThan(del.indexOf("db.delete(claimAttachments)"));
    expect(del.indexOf("writeEoAudit")).toBeLessThan(del.indexOf("unlink("));
  });

  it("stub quote PDF regeneration hides the prior row instead of deleting it", () => {
    const quotes = readFileSync("src/lib/crm/quote-docs.ts", "utf8");
    expect(quotes).toMatch(/writeEoAuditSafe/);
    expect(quotes).toMatch(/status: "hidden"/);
    expect(quotes).not.toMatch(/\.delete\(documents\)/);
  });
});
