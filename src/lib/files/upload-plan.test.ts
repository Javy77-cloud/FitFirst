import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isDeclarationPdf } from "@/lib/policy/mint-gate";
import { isQuoteFileDoc } from "@/lib/deals/quote-docs";
import {
  CASTELLANOS_WIND_MIT_FILENAME,
  INSURANCE_PDF_MAX_BYTES,
  VERCEL_INCOMING_BODY_MAX_BYTES,
  agencyQuoteTags,
  displayFilename,
  isolateUploadFactor,
  messageFromUploadError,
  planUpload,
  storageObjectKey,
  storagePathProblems,
  storedMimeForUpload,
} from "./upload-plan";

const MB = 1024 * 1024;
const filename = CASTELLANOS_WIND_MIT_FILENAME;
const id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const rawPath = `11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/${id}-${filename}`;
const safePath = storageObjectKey(rawPath);

describe("Castellanos wind-mit save: size vs name vs MIME vs path", () => {
  it("fails on the storage path because of &, even at 1KB with a real PDF mime", () => {
    const split = new URL(`https://files.example/read?path=${rawPath}`);
    expect(split.searchParams.get("path")).not.toBe(rawPath);
    expect([...split.searchParams.keys()].join(" ")).toMatch(/ROSA CASTELLANOS/);
    const rosa = "Rosa Castellanos Florida Peninsula HO3 Dec Page.pdf";
    const rosaRaw = rawPath.replace(filename, rosa);
    expect(new URL(`https://files.example/read?path=${rosaRaw}`).searchParams.get("path")).toBe(rosaRaw);
    const encoded = new URLSearchParams({ pathname: rawPath });
    expect(new URL(`https://blob.vercel-storage.com/?${encoded}`).searchParams.get("pathname")).toBe(rawPath);
    const fd = new FormData();
    fd.set("file", new File([Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])], filename, { type: "application/octet-stream" }));
    const uploaded = fd.get("file");
    expect(uploaded).toBeInstanceOf(File);
    if (uploaded instanceof File) {
      expect(uploaded.name).toBe(filename);
      expect(uploaded.size).toBe(5);
      expect(uploaded.type).toBe("application/octet-stream");
    }
    expect(storagePathProblems(rawPath)).toEqual(["&"]);
    const blocked = isolateUploadFactor({
      filename,
      byteLength: 1024,
      mimeType: "application/pdf",
      storagePath: rawPath,
      bytesArePdf: true,
    });
    expect(blocked?.factor).toBe("path");
    expect(blocked?.detail).toMatch(/&/);
    expect(blocked?.detail).toMatch(/Display name/);
  });

  it("is not the display name: a short safe name still fails on that same path", () => {
    expect(displayFilename(filename)).toBe(filename);
    expect(displayFilename(filename)).toMatch(/&/);
    expect(displayFilename(filename)).not.toMatch(/_/);
    const blocked = isolateUploadFactor({
      filename: "quote.pdf",
      byteLength: 1024,
      mimeType: "application/pdf",
      storagePath: rawPath,
      bytesArePdf: true,
    });
    expect(blocked?.factor).toBe("path");
  });

  it("is not MIME: .PDF, empty type, and octet-stream all store as application/pdf", () => {
    const pdf = Buffer.from("%PDF-1.4");
    expect(storedMimeForUpload(filename, "application/octet-stream", pdf)).toBe("application/pdf");
    expect(storedMimeForUpload(filename, "", pdf)).toBe("application/pdf");
    expect(storedMimeForUpload(filename, "application/pdf", pdf)).toBe("application/pdf");
    expect(storedMimeForUpload(filename, "application/octet-stream")).toBe("application/pdf");
    const saved = isolateUploadFactor({
      filename,
      byteLength: 1024,
      mimeType: "application/octet-stream",
      storagePath: safePath,
      bytesArePdf: true,
    });
    expect(saved).toBeNull();
  });

  it("is not size at 25MB once the path is safe, and states the real cap above that", () => {
    expect(25 * MB).toBeLessThan(INSURANCE_PDF_MAX_BYTES);
    expect(
      isolateUploadFactor({
        filename,
        byteLength: 25 * MB,
        mimeType: "application/pdf",
        storagePath: safePath,
        bytesArePdf: true,
      }),
    ).toBeNull();
    const over = isolateUploadFactor({
      filename,
      byteLength: INSURANCE_PDF_MAX_BYTES + 1,
      mimeType: "application/pdf",
      storagePath: safePath,
      bytesArePdf: true,
    });
    expect(over?.factor).toBe("size");
    expect(over?.detail).toMatch(/45 MB/);
  });

  it("keeps a readable display name and a storage key without & or spaces", () => {
    expect(safePath).not.toContain("&");
    expect(safePath).not.toContain(" ");
    expect(safePath).not.toContain("#");
    expect(safePath.endsWith(".pdf")).toBe(true);
    expect(safePath).not.toContain(filename);
    expect(displayFilename(filename)).toBe(filename);
    expect(storagePathProblems(safePath)).toEqual([]);
  });

  it("spaces alone are not the failure (Rosa's dec name saves)", () => {
    const rosa = "Rosa Castellanos Florida Peninsula HO3 Dec Page.pdf";
    const rosaPath = storageObjectKey(`tenant/deal/${id}-${rosa}`);
    expect(rosa).toContain(" ");
    expect(storagePathProblems(`tenant/deal/${id}-${rosa}`)).toEqual([]);
    expect(
      isolateUploadFactor({
        filename: rosa,
        byteLength: 200_000,
        mimeType: "application/pdf",
        storagePath: rosaPath,
        bytesArePdf: true,
      }),
    ).toBeNull();
  });

  it("sends a 25MB Vercel upload through Blob and states the 4.5MB request cap otherwise", () => {
    const direct = planUpload({
      filename,
      byteLength: 25 * MB,
      mimeType: "application/octet-stream",
      onVercel: true,
      directBlob: true,
      bytesArePdf: true,
    });
    expect(direct.ok).toBe(true);
    if (direct.ok) {
      expect(direct.via).toBe("blob-client");
      expect(direct.displayName).toBe(filename);
      expect(direct.mimeType).toBe("application/pdf");
    }
    const blocked = planUpload({
      filename,
      byteLength: 25 * MB,
      mimeType: "application/pdf",
      onVercel: true,
      directBlob: false,
      bytesArePdf: true,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.factor).toBe("size");
      expect(blocked.error).toMatch(/4\.5 MB/);
      expect(blocked.error).toMatch(/was not saved/);
      expect(blocked.error.toLowerCase()).not.toMatch(/try again/);
    }
    expect(VERCEL_INCOMING_BODY_MAX_BYTES).toBeLessThan(25 * MB);
    const local = planUpload({
      filename,
      byteLength: 25 * MB,
      mimeType: "application/pdf",
      onVercel: false,
      directBlob: false,
      bytesArePdf: true,
    });
    expect(local.ok).toBe(true);
    if (local.ok) expect(local.via).toBe("server-action");
  });

  it("stores the wind mit as a supporting quote file, not a declaration", () => {
    const tags = agencyQuoteTags({ quoteId: "q-ho3", filename, displayName: filename });
    expect(tags).toContain("supporting:wind_mit");
    expect(tags).toContain("label:" + filename);
    const doc = {
      id: "d1",
      slot: "quote_file",
      docType: "agency_quote",
      filename,
      mimeType: "application/pdf",
      tags,
    };
    expect(isQuoteFileDoc(doc)).toBe(true);
    expect(isDeclarationPdf(doc)).toBe(false);
  });

  it("turns storage failures into a specific message", () => {
    const pathMsg = messageFromUploadError(
      new Error('Vercel Blob: pathname cannot contain "&"'),
      filename,
    );
    expect(pathMsg).toMatch(/storage path/);
    expect(pathMsg).toMatch(/Nothing was saved/);
    expect(pathMsg.toLowerCase()).not.toMatch(/try again/);
    expect(messageFromUploadError(new Error("Could not save documents. Try again."), filename)).not.toMatch(
      /try again/i,
    );
  });

  it("wires the quote upload, blob client route, and object store to the safe key", () => {
    const quote = readFileSync("src/app/actions/quote-files.ts", "utf8");
    const plan = readFileSync("src/lib/files/upload-plan.ts", "utf8");
    expect(quote).toContain("agencyQuoteTags");
    expect(quote).toContain("planUpload");
    expect(quote).not.toContain(".delete(documents)");
    expect(plan).toContain("supporting:wind_mit");
    const store = readFileSync("src/lib/files/object-store.ts", "utf8");
    expect(store).toContain("storageObjectKey");
    const route = readFileSync("src/app/api/files/client-upload/route.ts", "utf8");
    expect(route).toContain("INSURANCE_PDF_MAX_BYTES");
    expect(route).toContain("handleUpload");
    expect(route).toContain("clientUploadPathError");
  });
});
