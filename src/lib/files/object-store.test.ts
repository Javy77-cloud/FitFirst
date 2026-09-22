import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BLOB_NOT_CONFIGURED_MESSAGE,
  BLOB_READBACK_NEEDS_RW_TOKEN_MESSAGE,
  assertStoredFileReadable,
  blobStoreReady,
  deleteStoredFile,
  isRemoteStoragePath,
  blobPathnameFromUrl,
  hasBlobReadWriteToken,
  probeStoredFile,
  readStoredFile,
  streamToBuffer,
  writeStoredFile,
  blobAuthOptions,
  storeIdFromRwToken,
  storeIdFromBlobUrl,
  normalizeBlobStoreId,
  sameBlobStoreId,
  canonicalBlobStoreId,
  privateBlobUrlForToken,
  readbackFailureMessage,
  describeBodyPrefix,
  getLastReadbackDiag,
} from "./object-store";
import { CASTELLANOS_WIND_MIT_FILENAME } from "./upload-plan";

const prevUpload = process.env.UPLOAD_DIR;
const prevBlob = process.env.BLOB_READ_WRITE_TOKEN;
const prevStoreId = process.env.BLOB_STORE_ID;
const prevVercel = process.env.VERCEL;
const prevLocalDurable = process.env.FF_LOCAL_DURABLE_UPLOADS;
const prevOidc = process.env.VERCEL_OIDC_TOKEN;

afterEach(() => {
  if (prevUpload === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = prevUpload;
  if (prevBlob === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = prevBlob;
  if (prevStoreId === undefined) delete process.env.BLOB_STORE_ID;
  else process.env.BLOB_STORE_ID = prevStoreId;
  if (prevVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = prevVercel;
  if (prevLocalDurable === undefined) delete process.env.FF_LOCAL_DURABLE_UPLOADS;
  else process.env.FF_LOCAL_DURABLE_UPLOADS = prevLocalDurable;
  if (prevOidc === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = prevOidc;
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("blobStoreReady", () => {
  it("is ready with token only", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_token";
    delete process.env.BLOB_STORE_ID;
    expect(blobStoreReady()).toBe(true);
  });

  it("is ready with store id only (OIDC)", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = "store_abc123";
    expect(blobStoreReady()).toBe(true);
  });

  it("is not ready with neither token nor store id", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    expect(blobStoreReady()).toBe(false);
  });
});

describe("object-store local path", () => {
  it("writes and reads bytes without inventing a name-only file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ff-uploads-"));
    process.env.UPLOAD_DIR = root;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    const stored = await writeStoredFile("docs/gloria.pdf", Buffer.from("%PDF-1.4 test"));
    expect(isRemoteStoragePath(stored)).toBe(false);
    const bytes = await readStoredFile(stored);
    expect(bytes?.toString()).toContain("%PDF-1.4");
    expect(await readStoredFile("docs/missing.pdf")).toBeNull();
    await deleteStoredFile(stored);
    expect(await readStoredFile(stored)).toBeNull();
    await rm(root, { recursive: true, force: true });
  });

  it("fails loud for durable deal uploads when Blob is not ready", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ff-uploads-"));
    process.env.UPLOAD_DIR = root;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    delete process.env.FF_LOCAL_DURABLE_UPLOADS;
    await expect(
      writeStoredFile("docs/deal-dec.pdf", Buffer.from("%PDF-1.4 test"), "application/pdf", {
        durable: true,
      }),
    ).rejects.toThrow(BLOB_NOT_CONFIGURED_MESSAGE);
    await rm(root, { recursive: true, force: true });
  });

  it("writes durable deal uploads locally when FF_LOCAL_DURABLE_UPLOADS=1", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ff-uploads-"));
    process.env.UPLOAD_DIR = root;
    process.env.FF_LOCAL_DURABLE_UPLOADS = "1";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    const stored = await writeStoredFile(
      "docs/deal-photo.png",
      Buffer.from("%PDF-1.4 test"),
      "image/png",
      { durable: true },
    );
    expect(isRemoteStoragePath(stored)).toBe(false);
    expect(await readStoredFile(stored)).not.toBeNull();
    await rm(root, { recursive: true, force: true });
  });

  it("stores the Castellanos wind-mit bytes under a safe key and keeps the readable name out of the path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ff-uploads-"));
    process.env.UPLOAD_DIR = root;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    const raw = `tenant/deal/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-${CASTELLANOS_WIND_MIT_FILENAME}`;
    const stored = await writeStoredFile(raw, Buffer.from("%PDF-1.4 wind mit"), "application/pdf");
    expect(stored).not.toContain("&");
    expect(stored).not.toContain(" ");
    expect(stored.endsWith(".pdf")).toBe(true);
    expect(stored).not.toContain(CASTELLANOS_WIND_MIT_FILENAME);
    expect(await readStoredFile(stored)).toEqual(Buffer.from("%PDF-1.4 wind mit"));
    await rm(root, { recursive: true, force: true });
  });

  it("fails loud on Vercel when Blob is not ready", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ff-uploads-"));
    process.env.UPLOAD_DIR = root;
    process.env.VERCEL = "1";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    await expect(writeStoredFile("docs/deal-dec.pdf", Buffer.from("%PDF-1.4 test"))).rejects.toThrow(
      BLOB_NOT_CONFIGURED_MESSAGE,
    );
    await rm(root, { recursive: true, force: true });
  });
});

describe("private blob pathname", () => {
  it("extracts the store pathname from a Vercel Blob URL", () => {
    expect(
      blobPathnameFromUrl(
        "https://abc123.private.blob.vercel-storage.com/tenant/deal/file.pdf",
      ),
    ).toBe("tenant/deal/file.pdf");
    expect(blobPathnameFromUrl("https://example.com/file.pdf")).toBeNull();
  });
});

describe("streamToBuffer", () => {
  it("reads a web ReadableStream via arrayBuffer", async () => {
    const stream = new Response(Buffer.from("%PDF-1.4 stream")).body!;
    expect((await streamToBuffer(stream)).toString()).toContain("%PDF-1.4");
  });
});

describe("probeStoredFile / assertStoredFileReadable local", () => {
  it("probes and asserts readable local files, rejects missing paths", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ff-uploads-"));
    process.env.UPLOAD_DIR = root;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    const stored = await writeStoredFile("docs/probe.pdf", Buffer.from("%PDF-1.4 probe"));
    expect(await probeStoredFile(stored)).toBe(true);
    await expect(assertStoredFileReadable(stored)).resolves.toBeUndefined();
    expect(await probeStoredFile("docs/nope.pdf")).toBe(false);
    await expect(assertStoredFileReadable("docs/nope.pdf")).rejects.toThrow(
      /Document bytes were written but could not be read back from storage/,
    );
    await rm(root, { recursive: true, force: true });
  });
});

describe("blobAuthOptions", () => {
  it("passes the RW token when set so OIDC cannot shadow put/get", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_store_testtoken";
    expect(blobAuthOptions()).toEqual({ token: "vercel_blob_rw_store_testtoken" });
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(blobAuthOptions()).toEqual({});
  });
});

describe("streamToBuffer getReader path", () => {
  it("reads chunks via getReader without relying on Response.arrayBuffer", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("%PDF-1.4"));
        controller.enqueue(encoder.encode(" more"));
        controller.close();
      },
    });
    const buf = await streamToBuffer(stream);
    expect(buf.toString()).toBe("%PDF-1.4 more");
  });
});

describe("readback auth messaging", () => {
  it("exposes RW-token guidance when only BLOB_STORE_ID is set", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = "store_fitfirst_docs";
    expect(hasBlobReadWriteToken()).toBe(false);
    expect(BLOB_READBACK_NEEDS_RW_TOKEN_MESSAGE).toMatch(/BLOB_READ_WRITE_TOKEN/);
    expect(BLOB_READBACK_NEEDS_RW_TOKEN_MESSAGE).toMatch(/Production/);
  });
});

describe("store id helpers", () => {
  it("parses store id from RW token and blob URL without leaking secrets", () => {
    expect(storeIdFromRwToken("vercel_blob_rw_zsetpgqienornflj_SECRETVALUE")).toBe(
      "zsetpgqienornflj",
    );
    expect(storeIdFromBlobUrl("https://zsetpgqienornflj.private.blob.vercel-storage.com/a/b.pdf")).toBe(
      "zsetpgqienornflj",
    );
    expect(normalizeBlobStoreId("store_zsetpgqienornflj")).toBe("zsetpgqienornflj");
    expect(privateBlobUrlForToken("tenant/deal/x.pdf", "vercel_blob_rw_zsetpgqienornflj_SECRET")).toBe(
      "https://zsetpgqienornflj.private.blob.vercel-storage.com/tenant/deal/x.pdf",
    );
  });

  it("treats the same store id with different casing as a match (not a mismatch)", () => {
    // Toast after #281 showed put host lowercase vs RW token store mixed-case;
    // store ids are DNS-like and must compare case-insensitively.
    const lower = "zsetpgqienornflj";
    const mixed = "zSETPGQIENORNFLJ";
    expect(lower.toLowerCase()).toBe(mixed.toLowerCase());
    expect(sameBlobStoreId(lower, mixed)).toBe(true);
    expect(sameBlobStoreId(lower, "otherstoreidxx")).toBe(false);
    expect(canonicalBlobStoreId(mixed)).toBe(lower);
    expect(storeIdFromBlobUrl(`https://${lower}.private.blob.vercel-storage.com/a.pdf`)).toBe(lower);
    expect(storeIdFromBlobUrl(`https://${mixed}.private.blob.vercel-storage.com/a.pdf`)).toBe(lower);
    expect(
      privateBlobUrlForToken("tenant/deal/x.pdf", `vercel_blob_rw_${mixed}_SECRET`),
    ).toBe(`https://${lower}.private.blob.vercel-storage.com/tenant/deal/x.pdf`);
  });
});

describe("private blob read hardening (source)", () => {
  it("prefers RW token on put/get, buffers via getReader, and falls back to presigned GET", () => {
    const src = readFileSync("src/lib/files/object-store.ts", "utf8");
    expect(src).toMatch(/export function blobAuthOptions/);
    expect(src).toMatch(/BLOB_READ_WRITE_TOKEN/);
    expect(src).toMatch(/Authorization: `Bearer \$\{bearer\}`/);
    expect(src).toMatch(/getReader\(\)/);
    expect(src).toMatch(/looksLikePdf/);
    expect(src).toMatch(/\.\.\.blobAuthOptions\(\)/);
    expect(src).toMatch(/issueSignedToken/);
    expect(src).toMatch(/presignUrl/);
    expect(src).toMatch(/READBACK_RETRY_DELAYS_MS/);
    expect(src).toMatch(/store_mismatch/);
    expect(src).toMatch(/downloadUrl/);
    expect(src).toMatch(/describeBodyPrefix/);
    expect(src).toMatch(/expectPdf/);
    expect(src).toMatch(/startsWith <!DOCTYPE/);
    expect(src).toMatch(/assertReadableFromPutResult/);
    expect(src).toMatch(/readBytesFromPutResult/);
  });
});

describe("RW token put/get alignment (mocked @vercel/blob)", () => {
  const RW_TOKEN = "vercel_blob_rw_zsetpgqienornflj_testsecret";
  const PUT_URL = "https://zsetpgqienornflj.private.blob.vercel-storage.com/tenant/deal/doc.pdf";
  const PDF = Buffer.from("%PDF-1.4 mock-bytes");

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = RW_TOKEN;
    process.env.BLOB_STORE_ID = "store_otherstoreid";
    process.env.VERCEL = "1";
    delete process.env.FF_LOCAL_DURABLE_UPLOADS;
  });

  it("put uses explicit RW token even when BLOB_STORE_ID is set for a different store", async () => {
    const put = vi.fn(async (_key: string, _body: Buffer, opts: { token?: string }) => {
      expect(opts.token).toBe(RW_TOKEN);
      return {
        url: PUT_URL,
        downloadUrl: `${PUT_URL}?download=1`,
        pathname: "tenant/deal/doc.pdf",
        contentType: "application/pdf",
        contentDisposition: "",
        etag: "etag",
      };
    });
    const del = vi.fn(async () => undefined);
    vi.doMock("@vercel/blob", () => ({
      put,
      get: vi.fn(),
      del,
      list: vi.fn(),
      issueSignedToken: vi.fn(),
      presignUrl: vi.fn(),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const auth = String((init?.headers as Record<string, string>)?.Authorization ?? "");
        expect(auth).toBe(`Bearer ${RW_TOKEN}`);
        expect(url).toContain("zsetpgqienornflj.private.blob.vercel-storage.com");
        return new Response(PDF, { status: 200, headers: { "content-type": "application/pdf" } });
      }),
    );

    const { writeStoredFile: writeFresh } = await import("./object-store");
    const url = await writeFresh("tenant/deal/doc.pdf", PDF, "application/pdf", { durable: true });
    expect(url).toBe(`${PUT_URL}?download=1`);
    expect(put).toHaveBeenCalled();
    const putOpts = put.mock.calls[0]![2] as { token?: string };
    expect(putOpts.token).toBe(RW_TOKEN);
  });

  it("surfaces HTTP 403 in read-back message without leaking the token", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = RW_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Forbidden", { status: 403 })),
    );

    const { readStoredFile: readFresh, readbackFailureMessage: msgFresh, getLastReadbackDiag: diagFresh } =
      await import("./object-store");

    const result = await readFresh(PUT_URL);
    expect(result).toBeNull();
    const diag = diagFresh();
    expect(diag?.reason).toBe("http_status");
    expect(diag?.status).toBe(403);
    expect(diag?.host).toBe("zsetpgqienornflj.private.blob.vercel-storage.com");
    const message = msgFresh(diag);
    expect(message).toMatch(/HTTP 403/);
    expect(message).toMatch(/zsetpgqienornflj\.private\.blob\.vercel-storage\.com/);
    expect(message).not.toContain("testsecret");
    expect(message).not.toContain(RW_TOKEN);
  });

  it("readbackFailureMessage includes store mismatch guidance", () => {
    process.env.BLOB_READ_WRITE_TOKEN = RW_TOKEN;
    const message = readbackFailureMessage({
      reason: "store_mismatch",
      host: "otherstore.private.blob.vercel-storage.com",
      detail: "put host otherstore vs RW token store zsetpgqienornflj",
    });
    expect(message).toMatch(/store mismatch|put host otherstore/i);
    expect(message).toMatch(/Recreate BLOB_READ_WRITE_TOKEN/);
    expect(message).not.toContain("testsecret");
  });

  it("same store different casing is not a mismatch and does not tell user to recreate token", async () => {
    const MIXED_TOKEN = "vercel_blob_rw_zSETPGQIENORNFLJ_testsecret";
    process.env.BLOB_READ_WRITE_TOKEN = MIXED_TOKEN;
    delete process.env.BLOB_STORE_ID;
    process.env.VERCEL = "1";

    const put = vi.fn(async () => ({
      url: PUT_URL,
      downloadUrl: `${PUT_URL}?download=1`,
      pathname: "tenant/deal/doc.pdf",
      contentType: "application/pdf",
      contentDisposition: "",
      etag: "etag",
    }));
    const del = vi.fn(async () => undefined);
    vi.doMock("@vercel/blob", () => ({
      put,
      get: vi.fn(async () => null),
      del,
      list: vi.fn(),
      issueSignedToken: vi.fn(),
      presignUrl: vi.fn(),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const auth = String((init?.headers as Record<string, string>)?.Authorization ?? "");
        expect(auth).toBe(`Bearer ${MIXED_TOKEN}`);
        // Host must be lowercase canonical form from put / constructed URL
        expect(url.toLowerCase()).toContain("zsetpgqienornflj.private.blob.vercel-storage.com");
        return new Response(PDF, { status: 200, headers: { "content-type": "application/pdf" } });
      }),
    );

    const { writeStoredFile: writeFresh, readbackFailureMessage: msgFresh } = await import("./object-store");
    const url = await writeFresh("tenant/deal/doc.pdf", PDF, "application/pdf", { durable: true });
    expect(url).toBe(`${PUT_URL}?download=1`);
    expect(put).toHaveBeenCalled();
    // Must not surface recreate-token guidance for casing-only "mismatch"
    expect(msgFresh()).not.toMatch(/Recreate BLOB_READ_WRITE_TOKEN/);
  });

  it("when read-back fails after case-insensitive store match, surfaces HTTP status not recreate-token", async () => {
    const MIXED_TOKEN = "vercel_blob_rw_zSETPGQIENORNFLJ_testsecret";
    process.env.BLOB_READ_WRITE_TOKEN = MIXED_TOKEN;
    delete process.env.BLOB_STORE_ID;
    process.env.VERCEL = "1";

    const put = vi.fn(async () => ({
      url: PUT_URL,
      downloadUrl: `${PUT_URL}?download=1`,
      pathname: "tenant/deal/doc.pdf",
      contentType: "application/pdf",
      contentDisposition: "",
      etag: "etag",
    }));
    const del = vi.fn(async () => undefined);
    vi.doMock("@vercel/blob", () => ({
      put,
      get: vi.fn(async () => {
        throw new Error("Failed to fetch blob: 403");
      }),
      del,
      list: vi.fn(),
      issueSignedToken: vi.fn(async () => {
        throw new Error("no sign");
      }),
      presignUrl: vi.fn(),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Forbidden", { status: 403 })),
    );

    const { writeStoredFile: writeFresh } = await import("./object-store");
    let message = "";
    try {
      await writeFresh("tenant/deal/doc.pdf", PDF, "application/pdf", { durable: true });
      expect.unreachable("writeStoredFile should have thrown");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(/HTTP 403/);
    expect(message).not.toMatch(/Recreate BLOB_READ_WRITE_TOKEN/);
    expect(message).not.toContain("testsecret");
    expect(message).not.toContain(MIXED_TOKEN);
  });
});


describe("describeBodyPrefix", () => {
  it("labels PDF magic, HTML, JSON, and XML without leaking body text", () => {
    expect(describeBodyPrefix(Buffer.from("%PDF-1.4 hello"))).toBe("startsWith %PDF");
    expect(describeBodyPrefix(Buffer.from("<!DOCTYPE html><html>"))).toBe("startsWith <!DOCTYPE");
    expect(describeBodyPrefix(Buffer.from('{"error":"nope"}'))).toBe("startsWith {");
    expect(describeBodyPrefix(Buffer.from('<?xml version="1.0"?>'))).toBe("startsWith <?xml");
    expect(describeBodyPrefix(Buffer.from("not a document"))).toBe("non-PDF text");
  });
});

describe("non-PDF / HTML body read-back (mocked)", () => {
  const RW_TOKEN = "vercel_blob_rw_zsetpgqienornflj_testsecret";
  const PUT_URL = "https://zsetpgqienornflj.private.blob.vercel-storage.com/tenant/deal/doc.pdf";
  const DOWNLOAD_URL = `${PUT_URL}?download=1`;
  const PDF = Buffer.from("%PDF-1.4 mock-bytes");
  const HTML = Buffer.from("<!DOCTYPE html><html><body>login</body></html>");
  const JSON_ERR = Buffer.from('{"error":"Unauthorized","code":"unauthorized"}');

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = RW_TOKEN;
    delete process.env.BLOB_STORE_ID;
    process.env.VERCEL = "1";
    delete process.env.FF_LOCAL_DURABLE_UPLOADS;
  });

  it("HTML from SDK get fails that strategy; PDF magic via presign passes without relying on raw Bearer", async () => {
    const put = vi.fn(async () => ({
      url: PUT_URL,
      downloadUrl: DOWNLOAD_URL,
      pathname: "tenant/deal/doc.pdf",
      contentType: "application/pdf",
      contentDisposition: "",
      etag: "etag",
    }));
    const del = vi.fn(async () => undefined);
    const htmlStream = async () => ({
      statusCode: 200 as const,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(HTML);
          controller.close();
        },
      }),
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      blob: {
        url: PUT_URL,
        downloadUrl: DOWNLOAD_URL,
        pathname: "tenant/deal/doc.pdf",
        contentType: "text/html; charset=utf-8",
        contentDisposition: "",
        cacheControl: "",
        size: HTML.length,
        uploadedAt: new Date(),
        etag: "e",
      },
    });
    const get = vi.fn(htmlStream);
    const issueSignedToken = vi.fn(async () => ({
      clientSigningToken: "client-sign",
      delegationToken: "deleg-sign",
    }));
    const PRESIGNED =
      "https://zsetpgqienornflj.private.blob.vercel-storage.com/tenant/deal/doc.pdf?X-Amz-Signature=abc";
    const presignUrl = vi.fn(async () => ({ presignedUrl: PRESIGNED }));
    vi.doMock("@vercel/blob", () => ({
      put,
      get,
      del,
      list: vi.fn(),
      issueSignedToken,
      presignUrl,
    }));

    let bearerHits = 0;
    let presignHits = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("X-Amz-Signature")) {
          presignHits += 1;
          expect(init?.headers && (init.headers as Record<string, string>).Authorization).toBeFalsy();
          return new Response(PDF, {
            status: 200,
            headers: { "content-type": "application/pdf" },
          });
        }
        bearerHits += 1;
        return new Response(HTML, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }),
    );

    const { writeStoredFile: writeFresh } = await import("./object-store");
    const url = await writeFresh("tenant/deal/doc.pdf", PDF, "application/pdf", { durable: true });
    expect(url).toBe(DOWNLOAD_URL);
    expect(get).toHaveBeenCalled();
    expect(presignHits).toBeGreaterThan(0);
    expect(issueSignedToken).toHaveBeenCalled();
    expect(put).toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    // Presign should win before raw Bearer is required for success.
    expect(presignHits).toBeGreaterThan(0);
  });

  it("JSON error body is not accepted as readable PDF and surfaces startsWith { in toast", async () => {
    const put = vi.fn(async () => ({
      url: PUT_URL,
      downloadUrl: DOWNLOAD_URL,
      pathname: "tenant/deal/doc.pdf",
      contentType: "application/pdf",
      contentDisposition: "",
      etag: "etag",
    }));
    const del = vi.fn(async () => undefined);
    vi.doMock("@vercel/blob", () => ({
      put,
      get: vi.fn(async () => null),
      del,
      list: vi.fn(),
      issueSignedToken: vi.fn(async () => {
        throw new Error("no sign");
      }),
      presignUrl: vi.fn(),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON_ERR, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const { writeStoredFile: writeFresh, readbackFailureMessage: msgFresh, getLastReadbackDiag: diagFresh } =
      await import("./object-store");
    let message = "";
    try {
      await writeFresh("tenant/deal/doc.pdf", PDF, "application/pdf", { durable: true });
      expect.unreachable("should throw");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(del).toHaveBeenCalled();
    expect(message).toMatch(/startsWith \{/);
    expect(message).toMatch(/auth error body|non-PDF body/);
    expect(message).toMatch(/zsetpgqienornflj\.private\.blob\.vercel-storage\.com/);
    expect(message).not.toContain("testsecret");
    expect(message).not.toContain(RW_TOKEN);
    const diag = diagFresh();
    expect(diag?.bodyPrefix).toBe("startsWith {");
  });

  it("PDF magic bytes pass accept path and clearer non-PDF diag includes content-type when present", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = RW_TOKEN;
    delete process.env.VERCEL;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(Buffer.from("ISSUED QUOTE NOT A PDF"), {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
      ),
    );
    vi.doMock("@vercel/blob", () => ({
      put: vi.fn(),
      get: vi.fn(async () => null),
      del: vi.fn(),
      list: vi.fn(),
      issueSignedToken: vi.fn(async () => {
        throw new Error("no");
      }),
      presignUrl: vi.fn(),
    }));

    const {
      readStoredFile: readFresh,
      readbackFailureMessage: msgFresh,
      getLastReadbackDiag: diagFresh,
      assertStoredFileReadable: assertFresh,
    } = await import("./object-store");

    expect(await readFresh(PUT_URL)).toBeNull();
    const diag = diagFresh();
    expect(diag?.reason === "non_pdf" || diag?.reason === "auth_body").toBe(true);
    expect(diag?.bodyPrefix).toMatch(/non-PDF|startsWith/);
    const message = msgFresh(diag);
    expect(message).toMatch(/non-PDF body|auth error body|non-PDF text/);
    expect(message).not.toContain("testsecret");

    await expect(assertFresh(PUT_URL)).rejects.toThrow(/Document bytes were written/);
  });
});


describe("formatReadbackDiag bodyPrefix always present", () => {
  it("non_pdf toast always includes bodyPrefix even when diag omits it", () => {
    const message = readbackFailureMessage({
      reason: "non_pdf",
      host: "zsetpgqienornflj.private.blob.vercel-storage.com",
    });
    expect(message).toMatch(/non-PDF body/);
    expect(message).toMatch(/unknown body|startsWith/);
    expect(message).toMatch(/zsetpgqienornflj\.private\.blob\.vercel-storage\.com/);
    // Quiet form from pre-#283 / missing bodyPrefix must not reappear.
    expect(message).not.toBe(
      "Document bytes were written but could not be read back from storage (non-PDF body, host zsetpgqienornflj.private.blob.vercel-storage.com). Nothing was saved.",
    );
  });

  it("auth_body toast always includes bodyPrefix and content-type when provided", () => {
    const message = readbackFailureMessage({
      reason: "auth_body",
      host: "zsetpgqienornflj.private.blob.vercel-storage.com",
      bodyPrefix: "startsWith <!DOCTYPE",
      contentType: "text/html; charset=utf-8",
    });
    expect(message).toMatch(/auth error body/);
    expect(message).toMatch(/startsWith <!DOCTYPE/);
    expect(message).toMatch(/content-type text\/html/);
  });
});

describe("assertReadableFromPutResult prefers downloadUrl / pathname over raw Bearer", () => {
  const RW_TOKEN = "vercel_blob_rw_zsetpgqienornflj_testsecret";
  const PUT_URL = "https://zsetpgqienornflj.private.blob.vercel-storage.com/tenant/deal/doc.pdf";
  const DOWNLOAD_URL = `${PUT_URL}?download=1`;
  const PDF = Buffer.from("%PDF-1.4 mock-bytes");

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = RW_TOKEN;
    delete process.env.BLOB_STORE_ID;
    process.env.VERCEL = "1";
  });

  it("succeeds via SDK get(pathname) without calling raw Bearer fetch", async () => {
    const get = vi.fn(async (urlOrPath: string) => {
      expect(String(urlOrPath)).toMatch(/tenant\/deal\/doc\.pdf/);
      return {
        statusCode: 200 as const,
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue(PDF);
            controller.close();
          },
        }),
        headers: new Headers({ "content-type": "application/pdf" }),
        blob: {
          url: PUT_URL,
          downloadUrl: DOWNLOAD_URL,
          pathname: "tenant/deal/doc.pdf",
          contentType: "application/pdf",
          contentDisposition: "",
          cacheControl: "",
          size: PDF.length,
          uploadedAt: new Date(),
          etag: "e",
        },
      };
    });
    vi.doMock("@vercel/blob", () => ({
      put: vi.fn(),
      get,
      del: vi.fn(),
      list: vi.fn(),
      issueSignedToken: vi.fn(),
      presignUrl: vi.fn(),
    }));
    const fetchMock = vi.fn(async () => {
      throw new Error("Bearer CDN must not be required when SDK get works");
    });
    vi.stubGlobal("fetch", fetchMock);

    const { assertReadableFromPutResult: assertFresh } = await import("./object-store");
    await assertFresh({
      url: PUT_URL,
      downloadUrl: DOWNLOAD_URL,
      pathname: "tenant/deal/doc.pdf",
    });
    expect(get).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
