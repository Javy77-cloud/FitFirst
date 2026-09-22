import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { looksLikeImageBuffer, looksLikePdf } from "@/lib/files/urls";
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

/** When OIDC can put but private CDN get fails without a RW token. */
export const BLOB_READBACK_NEEDS_RW_TOKEN_MESSAGE =
  "Document bytes were written but could not be read back from storage. Set BLOB_READ_WRITE_TOKEN on Production for the fitfirst-docs store, then retry the upload. Nothing was saved.";

/**
 * Prefer the static read-write token when present.
 * OIDC alone can succeed on `put` then fail on private CDN `get` in some runtimes;
 * an explicit token always takes priority in the SDK and keeps put/get aligned.
 */
export function blobAuthOptions(): { token?: string } {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token ? { token } : {};
}

export function hasBlobReadWriteToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function readbackFailureMessage(): string {
  // OIDC put + private CDN get mismatch: RW token is the durable Production fix.
  if (!hasBlobReadWriteToken() && process.env.BLOB_STORE_ID?.trim()) {
    return BLOB_READBACK_NEEDS_RW_TOKEN_MESSAGE;
  }
  return BLOB_READBACK_FAILED_MESSAGE;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/**
 * Prefer getReader chunking — wrapping a fetch body in `new Response(stream).arrayBuffer()`
 * has returned empty buffers on some Vercel/undici runtimes while the stream still had bytes
 * (put read-back then falsely passed length checks on a later path, or View saw empty).
 */
export async function streamToBuffer(
  stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream,
): Promise<Buffer> {
  if (stream && typeof (stream as ReadableStream<Uint8Array>).getReader === "function") {
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const chunks: Buffer[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.byteLength) chunks.push(Buffer.from(value));
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* already released */
      }
    }
    if (chunks.length > 0) return Buffer.concat(chunks);
    // Last resort if getReader yielded nothing (locked/empty) — cannot re-read same stream.
  }
  if (stream && Symbol.asyncIterator in Object(stream)) {
    const chunks: Buffer[] = [];
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

function looksLikeAuthErrorBody(bytes: Buffer): boolean {
  const head = bytes.subarray(0, 256).toString("utf8").trim().toLowerCase();
  if (!head) return false;
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return true;
  if (head === "forbidden" || head === "unauthorized") return true;
  if (head.includes("access denied") || head.includes("blob access")) return true;
  if (head.includes("unauthorized") && head.length < 200) return true;
  return false;
}

async function readViaSdkGet(urlOrPathname: string): Promise<Buffer | null> {
  const auth = blobAuthOptions();
  const attempts: Array<{ access: "private"; useCache?: boolean }> = [
    { access: "private", useCache: false },
    { access: "private" },
  ];
  for (const opts of attempts) {
    try {
      const { get } = await import("@vercel/blob");
      const result = await get(urlOrPathname, { ...opts, ...auth });
      if (!result || result.statusCode !== 200 || !result.stream) continue;
      const buf = await streamToBuffer(result.stream);
      if (buf.length > 0 && !looksLikeAuthErrorBody(buf)) return buf;
      // Metadata said size>0 but body empty/auth — try next strategy.
      if (result.blob?.size && result.blob.size > 0 && buf.length === 0) continue;
    } catch {
      /* try next strategy */
    }
  }
  return null;
}

/** Direct private CDN fetch with the RW token — bypasses SDK/OIDC mismatch. */
async function readViaBearerFetch(url: string): Promise<Buffer | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 0 && !looksLikeAuthErrorBody(buf)) return buf;
  } catch {
    /* missing token / network */
  }
  return null;
}

/**
 * Control-plane issueSignedToken + client-side presign, then fetch the signed CDN URL.
 * `put` already proves OIDC/token can talk to the Blob API; private CDN Bearer `get` may
 * still 403 under OIDC-only. Presigned GET uses the same API auth as put, then reads
 * without a Bearer header on the CDN.
 */
async function readViaPresignedGet(pathname: string): Promise<Buffer | null> {
  const key = posixKey(pathname);
  if (!key || !blobStoreReady()) return null;
  try {
    const { issueSignedToken, presignUrl } = await import("@vercel/blob");
    const auth = blobAuthOptions();
    const signed = await issueSignedToken({
      pathname: key,
      operations: ["get"],
      ...auth,
    });
    const { presignedUrl } = await presignUrl(
      {
        clientSigningToken: signed.clientSigningToken,
        delegationToken: signed.delegationToken,
      },
      {
        operation: "get",
        pathname: key,
        access: "private",
        useCache: false,
      },
    );
    if (!presignedUrl) return null;
    const res = await fetch(presignedUrl, { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 0 && !looksLikeAuthErrorBody(buf)) return buf;
  } catch {
    /* OIDC/token cannot issue, or CDN rejected signature */
  }
  return null;
}

async function readPrivateBlob(urlOrPathname: string): Promise<Buffer | null> {
  const viaSdk = await readViaSdkGet(urlOrPathname);
  if (viaSdk) return viaSdk;
  if (/^https?:\/\//i.test(urlOrPathname)) {
    const viaBearer = await readViaBearerFetch(urlOrPathname);
    if (viaBearer) return viaBearer;
    const pathname = blobPathnameDecoded(urlOrPathname) ?? blobPathnameFromUrl(urlOrPathname);
    if (pathname) {
      const viaPresign = await readViaPresignedGet(pathname);
      if (viaPresign) return viaPresign;
    }
    return null;
  }
  const viaPresign = await readViaPresignedGet(urlOrPathname);
  if (viaPresign) return viaPresign;
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
    // Explicit presign last resort (pathname from put URL).
    const presignKey = decoded || pathname;
    const viaPresign = await readViaPresignedGet(presignKey);
    if (viaPresign) return viaPresign;
    return null;
  }
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(url, { access: "private", ...blobAuthOptions() });
    const stream = result?.stream;
    if (stream) {
      const buf = await streamToBuffer(stream);
      if (buf.length > 0 && !looksLikeAuthErrorBody(buf)) return buf;
    }
  } catch {
    /* public URL or older SDK */
  }
  const viaBearer = await readViaBearerFetch(url);
  if (viaBearer) return viaBearer;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (looksLikeAuthErrorBody(buf)) return null;
    return buf;
  } catch {
    return null;
  }
}

async function readBlobByPrefix(relPath: string): Promise<Buffer | null> {
  if (!blobStoreReady()) return null;
  try {
    const { list } = await import("@vercel/blob");
    const key = posixKey(relPath);
    const listed = await list({ prefix: key, limit: 8, ...blobAuthOptions() });
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
 * Existence check for preview probes. Always requires a real byte read —
 * Blob head() alone can succeed while get() streams empty, which previously
 * mounted a blank PDF iframe after probe said ready.
 */
export async function probeStoredFile(storagePath: string): Promise<boolean> {
  const raw = (storagePath ?? "").trim();
  if (!raw) return false;
  const bytes = await readStoredFile(raw);
  return Boolean(bytes && bytes.length > 0 && !looksLikeAuthErrorBody(bytes));
}

function expectDurableBytes(storagePath: string, bytes: Buffer): void {
  if (looksLikeAuthErrorBody(bytes)) {
    throw new Error(readbackFailureMessage());
  }
  const lower = storagePath.toLowerCase();
  const wantsPdf =
    lower.includes(".pdf") || lower.includes("application/pdf") || /\/[^/?#]+\.pdf(?:$|\?)/i.test(lower);
  if (wantsPdf && !looksLikePdf(bytes) && !looksLikeImageBuffer(bytes)) {
    throw new Error(readbackFailureMessage());
  }
}

/** Backoff after put — private CDN can 404 briefly before the object is visible. */
const READBACK_RETRY_DELAYS_MS = [0, 150, 350, 700, 1200] as const;

/**
 * After a durable put, confirm bytes are readable before callers insert a row.
 * Retries briefly so a race with private CDN visibility does not fail the attach.
 */
export async function assertStoredFileReadable(storagePath: string): Promise<void> {
  // Require a real byte read (not head-only) so View/serve can load the same path.
  let lastError: Error | null = null;
  for (let i = 0; i < READBACK_RETRY_DELAYS_MS.length; i++) {
    const delay = READBACK_RETRY_DELAYS_MS[i]!;
    if (delay > 0) await sleep(delay);
    try {
      const bytes = await readStoredFile(storagePath);
      if (bytes && bytes.length > 0) {
        expectDurableBytes(storagePath, bytes);
        return;
      }
      lastError = new Error(readbackFailureMessage());
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(readbackFailureMessage());
    }
  }
  throw lastError ?? new Error(readbackFailureMessage());
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
        ...blobAuthOptions(),
      });
      if (blob?.url) {
        try {
          // Prefer put URL + same auth; retries inside assert cover CDN visibility races.
          await assertStoredFileReadable(blob.url);
        } catch (error) {
          // Pathname-based read (SDK builds CDN host from store id / token) before giving up.
          if (blob.pathname) {
            try {
              const byPath = await readPrivateBlob(blob.pathname);
              if (byPath && byPath.length > 0) {
                expectDurableBytes(blob.url, byPath);
                return blob.url;
              }
            } catch {
              /* fall through to cleanup */
            }
          }
          try {
            const { del } = await import("@vercel/blob");
            await del(blob.url, blobAuthOptions());
          } catch {
            /* best-effort cleanup */
          }
          if (requireRemote) {
            throw error instanceof Error ? error : new Error(readbackFailureMessage());
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
      await del(raw, blobAuthOptions());
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
