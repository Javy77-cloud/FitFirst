import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BLOB_NOT_CONFIGURED_MESSAGE,
  BLOB_READBACK_FAILED_MESSAGE,
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
} from "./object-store";
import { CASTELLANOS_WIND_MIT_FILENAME } from "./upload-plan";

const prevUpload = process.env.UPLOAD_DIR;
const prevBlob = process.env.BLOB_READ_WRITE_TOKEN;
const prevStoreId = process.env.BLOB_STORE_ID;
const prevVercel = process.env.VERCEL;
const prevLocalDurable = process.env.FF_LOCAL_DURABLE_UPLOADS;

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
      BLOB_READBACK_FAILED_MESSAGE,
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

describe("private blob read hardening (source)", () => {
  it("prefers RW token on put/get, buffers via getReader, and falls back to presigned GET", () => {
    const src = readFileSync("src/lib/files/object-store.ts", "utf8");
    expect(src).toMatch(/export function blobAuthOptions/);
    expect(src).toMatch(/BLOB_READ_WRITE_TOKEN/);
    expect(src).toMatch(/Authorization: `Bearer \$\{token\}`/);
    expect(src).toMatch(/getReader\(\)/);
    expect(src).toMatch(/looksLikePdf/);
    expect(src).toMatch(/\.\.\.blobAuthOptions\(\)/);
    expect(src).toMatch(/issueSignedToken/);
    expect(src).toMatch(/presignUrl/);
    expect(src).toMatch(/READBACK_RETRY_DELAYS_MS/);
  });
});
