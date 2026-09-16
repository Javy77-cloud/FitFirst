import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const prevUpload = process.env.UPLOAD_DIR;
const prevBlob = process.env.BLOB_READ_WRITE_TOKEN;

afterEach(() => {
  if (prevUpload === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = prevUpload;
  if (prevBlob === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = prevBlob;
});

describe("object-store local path", () => {
  it("writes and reads bytes without inventing a name-only file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ff-uploads-"));
    process.env.UPLOAD_DIR = root;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const { writeStoredFile, readStoredFile, deleteStoredFile, isRemoteStoragePath } = await import(
      "./object-store"
    );
    const stored = await writeStoredFile("docs/gloria.pdf", Buffer.from("%PDF-1.4 test"));
    expect(isRemoteStoragePath(stored)).toBe(false);
    const bytes = await readStoredFile(stored);
    expect(bytes?.toString()).toContain("%PDF-1.4");
    expect(await readStoredFile("docs/missing.pdf")).toBeNull();
    await deleteStoredFile(stored);
    expect(await readStoredFile(stored)).toBeNull();
    await rm(root, { recursive: true, force: true });
  });
});
