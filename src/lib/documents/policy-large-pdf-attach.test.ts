import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  planUpload,
  VERCEL_INCOMING_BODY_MAX_BYTES,
  INSURANCE_PDF_MAX_BYTES,
} from "@/lib/files/upload-plan";

const MB = 1024 * 1024;

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Policy Documents large inspection PDF attach", () => {
  it("plans 7–15MB PDFs through blob-client on Vercel when Blob is ready", () => {
    for (const mb of [7, 10, 15]) {
      const plan = planUpload({
        filename: `wind-mit-${mb}mb.pdf`,
        byteLength: mb * MB,
        mimeType: "application/pdf",
        onVercel: true,
        directBlob: true,
        bytesArePdf: true,
      });
      expect(plan.ok, `${mb}MB`).toBe(true);
      if (plan.ok) expect(plan.via).toBe("blob-client");
    }
    expect(VERCEL_INCOMING_BODY_MAX_BYTES).toBeLessThan(7 * MB);
    expect(INSURANCE_PDF_MAX_BYTES).toBeGreaterThanOrEqual(15 * MB);
  });

  it("wires Policy Documents UI to planUpload + Blob prepare/commit (not raw form action for large files)", () => {
    const tab = source("src/components/policy/tabs/documents-tab.tsx");
    const attach = source("src/components/policy/policy-documents-attach.tsx");
    const actions = source("src/app/actions/policy-files.ts");
    const page = source("src/app/policies/[id]/page.tsx");
    const route = source("src/app/api/files/client-upload/route.ts");

    expect(tab).toMatch(/PolicyDocumentsAttach/);
    expect(tab).toMatch(/uploadMode/);
    expect(attach).toMatch(/planUpload\(/);
    expect(attach).toMatch(/preparePolicyBlobUpload/);
    expect(attach).toMatch(/savePolicyDocumentFromBlob/);
    expect(attach).toMatch(/uploadBytesToBlob/);
    expect(attach).toMatch(/via === "blob-client"/);
    expect(attach).toMatch(/data-ff-policy-attach-error/);
    expect(attach).not.toMatch(/action=\{attachPolicyFiles\}/);

    expect(actions).toMatch(/export async function preparePolicyBlobUpload/);
    expect(actions).toMatch(/export async function savePolicyDocumentFromBlob/);
    expect(actions).toMatch(/existingStoragePath: storageUrl/);
    expect(actions).toMatch(/slot: "policy_file"/);
    expect(actions).toMatch(/planUpload\(/);

    expect(page).toMatch(/quoteFileUploadMode/);
    expect(page).toMatch(/blobStoreReady/);
    expect(route).toMatch(/deal or policy/);
  });

  it("keeps PolicyFileAttach on the same large-PDF Blob path", () => {
    const attach = source("src/components/policy/policy-file-attach.tsx");
    expect(attach).toMatch(/preparePolicyBlobUpload/);
    expect(attach).toMatch(/savePolicyDocumentFromBlob/);
    expect(attach).toMatch(/planUpload\(/);
    expect(attach).toMatch(/FileActionMenu/);
  });
});
