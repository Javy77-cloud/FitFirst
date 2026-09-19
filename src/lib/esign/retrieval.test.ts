import { describe, expect, it } from "vitest";
import {
  capabilitiesForRow,
  classifySignedFormType,
  filterSignedRows,
  mergeSignedRows,
  normalizeSignedStatus,
  parseSignedRowId,
  providerEnvelopeIdFromResult,
  signedDownloadHref,
  signedRowId,
  toSignedRow,
} from "./retrieval";

describe("signed retrieval classification", () => {
  it("maps pipeline types and loose labels onto the desk filters", () => {
    expect(classifySignedFormType({ pipelineType: "acord" })).toBe("acord");
    expect(classifySignedFormType({ pipelineType: "loss_run" })).toBe("loss_run");
    expect(classifySignedFormType({ filename: "No-Run-Loss.pdf" })).toBe("loss_run");
    expect(classifySignedFormType({ subject: "Please sign AOR" })).toBe("aor");
    expect(classifySignedFormType({ docType: "cancellation_pack" })).toBe("cancellation");
    expect(classifySignedFormType({ filename: "signed-application.pdf" })).toBe("other");
    expect(classifySignedFormType({ tags: ["form_send", "aor"] })).toBe("aor");
  });

  it("normalizes vendor and in-desk statuses onto sent / viewed / completed", () => {
    expect(normalizeSignedStatus("out_for_signature")).toBe("sent");
    expect(normalizeSignedStatus("sent")).toBe("sent");
    expect(normalizeSignedStatus("viewed")).toBe("viewed");
    expect(normalizeSignedStatus("delivered")).toBe("viewed");
    expect(normalizeSignedStatus("signed")).toBe("completed");
    expect(normalizeSignedStatus("completed")).toBe("completed");
    expect(normalizeSignedStatus("done")).toBe("completed");
  });
});

describe("signed retrieval merge + filter", () => {
  it("drops signature rows that already sit on a #147 pipeline envelope", () => {
    const pipeline = [
      toSignedRow({
        source: "pipeline",
        recordId: "job-1",
        jobId: "job-1",
        providerEnvelopeId: "env-ds-1",
        pipelineType: "acord",
        status: "completed",
        signerName: "Elena Ruiz",
        dealId: "deal-1",
        documentId: "doc-1",
        filename: "ACORD-HO3-filled.pdf",
        sentAt: "2026-09-18T12:00:00.000Z",
      }),
    ];
    const envelopes = [
      toSignedRow({
        source: "signature",
        recordId: "sig-1",
        envelopeRecordId: "sig-1",
        providerEnvelopeId: "env-ds-1",
        provider: "docusign",
        status: "completed",
        signerName: "Elena Ruiz",
        dealId: "deal-1",
        documentId: "doc-1",
      }),
      toSignedRow({
        source: "signature",
        recordId: "sig-2",
        envelopeRecordId: "sig-2",
        provider: "in_desk",
        status: "signed",
        signerName: "Maya Rivera",
        publicToken: "idesk-abc",
        filename: "application.pdf",
        sentAt: "2026-09-19T09:00:00.000Z",
      }),
    ];
    const merged = mergeSignedRows(pipeline, envelopes);
    expect(merged.map((row) => row.id)).toEqual(["e:sig-2", "p:job-1"]);
    expect(merged[0]?.formType).toBe("other");
    expect(merged[1]?.formType).toBe("acord");
  });

  it("searches signer/client and filters status + form type", () => {
    const rows = [
      toSignedRow({
        source: "pipeline",
        recordId: "job-acord",
        pipelineType: "acord",
        status: "completed",
        signerName: "Elena Ruiz",
        clientName: "Elena Ruiz",
        sentAt: "2026-09-18T12:00:00.000Z",
      }),
      toSignedRow({
        source: "pipeline",
        recordId: "job-aor",
        pipelineType: "aor",
        status: "sent",
        signerName: "Gloria Heather",
        sentAt: "2026-09-17T12:00:00.000Z",
      }),
    ];
    expect(filterSignedRows(rows, { q: "elena" }).map((row) => row.jobId)).toEqual(["job-acord"]);
    expect(filterSignedRows(rows, { status: "sent" }).map((row) => row.jobId)).toEqual(["job-aor"]);
    expect(filterSignedRows(rows, { form: "acord" }).map((row) => row.jobId)).toEqual(["job-acord"]);
    expect(filterSignedRows(rows, { q: "nobody" })).toEqual([]);
  });
});

describe("signed retrieval actions", () => {
  it("exposes download / resend / copy when the envelope supports them", () => {
    expect(
      capabilitiesForRow({
        status: "completed",
        documentId: "doc-1",
        providerEnvelopeId: "env-1",
      }),
    ).toEqual({ canDownload: true, canResend: false, canCopyLink: false });
    expect(
      capabilitiesForRow({
        status: "sent",
        providerEnvelopeId: "env-1",
      }),
    ).toEqual({ canDownload: false, canResend: true, canCopyLink: true });
    expect(
      capabilitiesForRow({
        status: "sent",
        publicToken: "idesk-1",
      }),
    ).toEqual({ canDownload: false, canResend: true, canCopyLink: true });
    expect(signedRowId("pipeline", "abc")).toBe("p:abc");
    expect(parseSignedRowId("e:xyz")).toEqual({ source: "signature", id: "xyz" });
    expect(signedDownloadHref("p:abc")).toBe("/api/esign/signed/p%3Aabc?download=1");
    expect(providerEnvelopeIdFromResult("completed:env-99")).toBe("env-99");
  });
});
