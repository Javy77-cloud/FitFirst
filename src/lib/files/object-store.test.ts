import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BLOB_NOT_CONFIGURED_MESSAGE,
  blobStoreReady,
  deleteStoredFile,
  isRemoteStoragePath,
  readStoredFile,
  writeStoredFile,
} from "./object-store";

const prevUpload = process.env.UPLOAD_DIR;
const prevBlob = process.env.BLOB_READ_WRITE_TOKEN;
const prevStoreId = process.env.BLOB_STORE_ID;
const prevVercel = process.env.VERCEL;

afterEach(() => {
  if (prevUpload === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = prevUpload;
  if (prevBlob === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = prevBlob;
  if (prevStoreId === undefined) delete process.env.BLOB_STORE_ID;
  else process.env.BLOB_STORE_ID = prevStoreId;
  if (prevVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = prevVercel;
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
    await expect(
      writeStoredFile("docs/deal-dec.pdf", Buffer.from("%PDF-1.4 test"), "application/pdf", {
        durable: true,
      }),
    ).rejects.toThrow(BLOB_NOT_CONFIGURED_MESSAGE);
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
