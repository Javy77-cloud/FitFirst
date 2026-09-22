import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { storageObjectKey } from "@/lib/files/upload-plan";

function uploadRoot(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

function uploadRoots(): string[] {
  const roots = [
    process.env.UPLOAD_DIR,
    path.join(process.cwd(), "uploads"),
    path.join(os.tmpdir(), "fitfirst-uploads"),
  ].filter((root): root is string => Boolean(root && root.trim()));
  return [...new Set(roots.map((root) => path.resolve(root)))];
}

export function isRemoteStoragePath(storagePath: string): boolean {
  return /^(https?:\/\/|blob:)/i.test(storagePath.trim());
}

/** Token auth or Vercel Blob OIDC (`BLOB_STORE_ID` + automatic `VERCEL_OIDC_TOKEN`). */
export function blobStoreReady(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim());
}

export const BLOB_NOT_CONFIGURED_MESSAGE =
  "Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID so deal documents are stored durably.";

export const BLOB_PUT_FAILED_MESSAGE = "Could not store the document in Vercel Blob.";

export const BLOB_READBACK_FAILED_MESSAGE =
  "Document bytes were written but could not be read back from storage. Nothing was saved.";

function requiresRemoteStorage(options?: { durable?: boolean }): boolean {
  // Local desk verification without Blob. Production (VERCEL) still requires remote.
  if (!process.env.VERCEL && process.env.FF_LOCAL_DURABLE_UPLOADS === "1") return false;
  return Boolean(options?.durable || process.env.VERCEL);
}

function localAbs(storagePath: string): string | null {
  const abs = path.resolve(/*turbopackIgnore: true*/ uploadRoot(), storagePath);
  const root = path.resolve(/*turbopackIgnore: true*/ uploadRoot());
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

function posixKey(relPath: string): string {
  return relPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Prefer Response.arrayBuffer / getReader — undici web streams are unreliable with for-await alone. */
export async function streamToBuffer(
  stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream,
): Promise<Buffer> {
  if (stream && typeof (stream as ReadableStream<Uint8Array>).getReader === "function") {
    const ab = await new Response(stream as ReadableStream<Uint8Array>).arrayBuffer();
    return Buffer.from(ab);
  }
  const chunks: Buffer[] = [];
  if (Symbol.asyncIterator in stream) {
    for await (const chunk of stream as AsyncIterable<Uint8Array | Buffer | string>) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Unsupported stream type");
}

/** Pathname inside a Vercel Blob store URL (private blobs need auth via get()). */
export function blobPathnameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/\.blob\.vercel-storage\.com$/i.test(parsed.hostname)) return null;
    // Keep encoding as the store sees it; also offer a decoded form to callers.
    const pathname = parsed.pathname.replace(/^\/+/, "");
    return pathname || null;
  } catch {
    return null;
  }
}

export function blobPathnameDecoded(url: string): string | null {
  const raw = blobPathnameFromUrl(url);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function headPrivateBlob(urlOrPathname: string): Promise<{ size: number } | null> {
  try {
    const { head } = await import("@vercel/blob");
    const meta = await head(urlOrPathname);
    if (meta && typeof meta.size === "number" && meta.size > 0) {
      return { size: meta.size };
    }
  } catch {
    /* missing token, wrong access, or not found */
  }
  return null;
}

async function readPrivateBlob(urlOrPathname: string): Promise<Buffer | null> {
  const attempts: Array<{ access: "private"; useCache?: boolean }> = [
    { access: "private", useCache: false },
    { access: "private" },
  ];
  for (const opts of attempts) {
    try {
      const { get } = await import("@vercel/blob");
      const result = await get(urlOrPathname, opts);
      const stream = result?.stream;
      if (!stream) continue;
      const buf = await streamToBuffer(stream);
      if (buf.length > 0) return buf;
    } catch {
      /* try next strategy */
    }
  }
  return null;
}

async function readRemoteUrl(url: string): Promise<Buffer | null> {
  // Private Vercel blobs: never fall through to bare fetch — that returns an
  // empty/unauthorized body that used to get wrapped into a blank PDF.
  const pathname = blobPathnameFromUrl(url);
  const decoded = blobPathnameDecoded(url);
  if (pathname) {
    const byUrl = await readPrivateBlob(url);
    if (byUrl) return byUrl;
    const byPath = await readPrivateBlob(pathname);
    if (byPath) return byPath;
    if (decoded && decoded !== pathname) {
      const byDecoded = await readPrivateBlob(decoded);
      if (byDecoded) return byDecoded;
    }
    return null;
  }
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(url, { access: "private" });
    const stream = result?.stream;
    if (stream) {
      const buf = await streamToBuffer(stream);
      if (buf.length > 0) return buf;
    }
  } catch {
    /* public URL or older SDK */
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function readBlobByPrefix(relPath: string): Promise<Buffer | null> {
  if (!blobStoreReady()) return null;
  try {
    const { list } = await import("@vercel/blob");
    const key = posixKey(relPath);
    const listed = await list({ prefix: key, limit: 8 });
    const hit =
      listed.blobs.find((row) => row.pathname === key) ??
      listed.blobs.find((row) => row.pathname.endsWith(path.posix.basename(key))) ??
      listed.blobs[0];
    if (!hit?.url) return null;
    return readRemoteUrl(hit.url);
  } catch {
    return null;
  }
}

async function writeLocalFile(relPath: string, buffer: Buffer): Promise<string> {
  const key = posixKey(relPath);
  let lastError: unknown = null;
  for (const root of uploadRoots()) {
    const abs = path.resolve(root, key);
    if (abs === root || !abs.startsWith(root + path.sep)) continue;
    try {
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, buffer);
      return key;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not store file bytes");
}

/**
 * Lightweight existence check for preview probes — prefer Blob head() so we do
 * not download the full PDF just to decide if View should open.
 */
export async function probeStoredFile(storagePath: string): Promise<boolean> {
  const raw = (storagePath ?? "").trim();
  if (!raw) return false;
  if (isRemoteStoragePath(raw)) {
    const pathname = blobPathnameFromUrl(raw);
    if (pathname) {
      if (await headPrivateBlob(raw)) return true;
      if (await headPrivateBlob(pathname)) return true;
      const decoded = blobPathnameDecoded(raw);
      if (decoded && decoded !== pathname && (await headPrivateBlob(decoded))) return true;
      // Fall through to a real read when head is unavailable (token/OIDC quirks).
    }
  }
  const bytes = await readStoredFile(raw);
  return Boolean(bytes && bytes.length > 0);
}

/**
 * After a durable put, confirm bytes are readable before callers insert a row.
 */
export async function assertStoredFileReadable(storagePath: string): Promise<void> {
  // Require a real byte read (not head-only) so View/serve can load the same path.
  const bytes = await readStoredFile(storagePath);
  if (bytes && bytes.length > 0) return;
  throw new Error(BLOB_READBACK_FAILED_MESSAGE);
}

/**
 * Persist bytes. Returns a blob URL when Blob is configured.
 * Deal documents (`durable`) and Vercel runtimes must not succeed with a local relative path —
 * that path is not durable on serverless and agents would treat the PDF as stored.
 */
export async function writeStoredFile(
  relPath: string,
  buffer: Buffer,
  contentType?: string,
  options?: { durable?: boolean },
): Promise<string> {
  const key = storageObjectKey(posixKey(relPath));
  const requireRemote = requiresRemoteStorage(options);
  if (blobStoreReady()) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(key, buffer, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: contentType || "application/octet-stream",
      });
      if (blob?.url) {
        try {
          await assertStoredFileReadable(blob.url);
        } catch (error) {
          try {
            const { del } = await import("@vercel/blob");
            await del(blob.url);
          } catch {
            /* best-effort cleanup */
          }
          if (requireRemote) {
            throw error instanceof Error ? error : new Error(BLOB_READBACK_FAILED_MESSAGE);
          }
          // Non-durable local fallback below.
          return writeLocalFile(key, buffer);
        }
        return blob.url;
      }
    } catch (error) {
      if (requireRemote) {
        throw error instanceof Error ? error : new Error(BLOB_PUT_FAILED_MESSAGE);
      }
    }
    if (requireRemote) {
      throw new Error(BLOB_PUT_FAILED_MESSAGE);
    }
  } else if (requireRemote) {
    throw new Error(BLOB_NOT_CONFIGURED_MESSAGE);
  }
  return writeLocalFile(key, buffer);
}

/**
 * Read stored bytes. Tries remote URL, then Vercel Blob by pathname, then local disk.
 * Returns null when the file is gone — callers must not invent a name-only PDF.
 */
export async function readStoredFile(storagePath: string): Promise<Buffer | null> {
  const raw = (storagePath ?? "").trim();
  if (!raw) return null;
  if (isRemoteStoragePath(raw)) {
    const remote = await readRemoteUrl(raw);
    if (remote) return remote;
    return null;
  }
  const fromBlob = await readBlobByPrefix(raw);
  if (fromBlob) return fromBlob;
  const abs = localAbs(raw);
  if (!abs) return null;
  try {
    return await readFile(/*turbopackIgnore: true*/ abs);
  } catch {
    return null;
  }
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  const raw = (storagePath ?? "").trim();
  if (!raw) return;
  if (isRemoteStoragePath(raw) || blobStoreReady()) {
    try {
      const { del } = await import("@vercel/blob");
      await del(raw);
    } catch {
      /* already gone or local-only */
    }
  }
  if (isRemoteStoragePath(raw)) return;
  const abs = localAbs(raw);
  if (!abs) return;
  try {
    await unlink(abs);
  } catch {
    /* missing on disk is fine */
  }
}
