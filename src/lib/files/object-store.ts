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
 * Always pass this into put/get/del/list/presign so the SDK never falls through to
 * OIDC+BLOB_STORE_ID (which would write to store A while Bearer/get use token store B).
 */
export function blobAuthOptions(): { token?: string } {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token ? { token } : {};
}

export function hasBlobReadWriteToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** `vercel_blob_rw_<storeId>_<secret>` — storeId segment only; never log the token. */
export function storeIdFromRwToken(token: string): string | null {
  const parts = token.trim().split("_");
  if (parts.length < 5) return null;
  if (parts[0] !== "vercel" || parts[1] !== "blob" || parts[2] !== "rw") return null;
  const storeId = parts[3]?.trim();
  return storeId || null;
}

/** Strip optional `store_` prefix (SDK normalizeStoreId). */
export function normalizeBlobStoreId(raw: string | undefined | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return value.startsWith("store_") ? value.slice("store_".length) : value;
}

/** Blob store ids / CDN host prefixes are case-insensitive (DNS + token segment). */
export function sameBlobStoreId(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Lowercase store id for CDN hostnames so put/get URLs match regardless of token casing. */
export function canonicalBlobStoreId(raw: string | null | undefined): string | null {
  const normalized = normalizeBlobStoreId(raw);
  return normalized ? normalized.toLowerCase() : null;
}

/** Host prefix from `https://{storeId}.private.blob.vercel-storage.com/...`. */
export function storeIdFromBlobUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const match = /^([a-z0-9]+)\.(?:public|private)\.blob\.vercel-storage\.com$/i.exec(host);
    const id = match?.[1] ?? null;
    return id ? id.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function blobHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export type ReadbackFailureReason = "http_status" | "empty" | "non_pdf" | "auth_body" | "store_mismatch";

export type ReadbackDiag = {
  reason: ReadbackFailureReason;
  status?: number;
  host?: string | null;
  detail?: string;
  /** Safe body-shape label only — never raw body / tokens (e.g. startsWith `<!DOCTYPE`). */
  bodyPrefix?: string;
  contentType?: string | null;
};

/** Last read-back diagnosis (status + host only — never token). */
let lastReadbackDiag: ReadbackDiag | null = null;

export function getLastReadbackDiag(): ReadbackDiag | null {
  return lastReadbackDiag;
}

function setReadbackDiag(diag: ReadbackDiag): void {
  // Do not let a later null-get 404 wipe a more specific auth_body / non_pdf / HTTP status
  // from an earlier strategy — that made toasts say empty/404 and burned retry budget.
  const prev = lastReadbackDiag;
  if (prev) {
    const prevSpecific =
      prev.reason === "auth_body" ||
      prev.reason === "non_pdf" ||
      (prev.reason === "http_status" && prev.status != null && prev.status !== 404);
    const incomingWeak404 =
      diag.reason === "http_status" && (diag.status === 404 || diag.status == null);
    const incomingEmpty = diag.reason === "empty";
    if (prevSpecific && (incomingWeak404 || incomingEmpty)) {
      return;
    }
  }
  lastReadbackDiag = diag;
}

function formatReadbackDiag(diag: ReadbackDiag | null): string {
  if (!diag) return "";
  const bits: string[] = [];
  if (diag.reason === "store_mismatch" && diag.detail) bits.push(diag.detail);
  else if (diag.reason === "http_status" && diag.status != null) bits.push(`HTTP ${diag.status}`);
  else if (diag.reason === "empty") bits.push("empty body");
  else if (diag.reason === "non_pdf") bits.push("non-PDF body");
  else if (diag.reason === "auth_body") bits.push("auth error body");
  if (diag.bodyPrefix) bits.push(diag.bodyPrefix);
  if (diag.contentType) bits.push(`content-type ${diag.contentType}`);
  if (diag.host) bits.push(`host ${diag.host}`);
  return bits.length ? ` (${bits.join(", ")})` : "";
}

export function readbackFailureMessage(diag?: ReadbackDiag | null): string {
  const active = diag ?? lastReadbackDiag;
  // OIDC put + private CDN get mismatch: RW token is the durable Production fix.
  if (!hasBlobReadWriteToken() && process.env.BLOB_STORE_ID?.trim()) {
    return BLOB_READBACK_NEEDS_RW_TOKEN_MESSAGE;
  }
  if (active?.reason === "store_mismatch") {
    return `Document bytes were written but could not be read back from storage${formatReadbackDiag(active)}. Recreate BLOB_READ_WRITE_TOKEN for the fitfirst-docs store on Production. Nothing was saved.`;
  }
  const suffix = formatReadbackDiag(active);
  if (suffix) {
    return `Document bytes were written but could not be read back from storage${suffix}. Nothing was saved.`;
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

/** Safe toast/label for the first bytes — never the raw body or secrets. */
export function describeBodyPrefix(bytes: Buffer): string {
  const head = bytes.subarray(0, 64).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  const lower = head.toLowerCase();
  if (looksLikePdf(bytes)) return "startsWith %PDF";
  if (looksLikeImageBuffer(bytes)) return "startsWith image-magic";
  if (lower.startsWith("<!doctype")) return "startsWith <!DOCTYPE";
  if (lower.startsWith("<html")) return "startsWith <html";
  if (head.startsWith("{")) return "startsWith {";
  if (head.startsWith("[")) return "startsWith [";
  if (lower.startsWith("<?xml")) return "startsWith <?xml";
  if (lower.startsWith("<")) return "startsWith <";
  if (!head) return "non-text body";
  return "non-PDF text";
}

function looksLikeAuthErrorBody(bytes: Buffer): boolean {
  const head = bytes.subarray(0, 256).toString("utf8").replace(/^\uFEFF/, "").trim().toLowerCase();
  if (!head) return false;
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return true;
  if (head.startsWith("<?xml")) return true;
  if (head.startsWith("{") || head.startsWith("[")) {
    // JSON error payloads from CDN / auth gate — not document bytes.
    return true;
  }
  if (head === "forbidden" || head === "unauthorized") return true;
  if (head.includes("access denied") || head.includes("blob access")) return true;
  if (head.includes("unauthorized") && head.length < 200) return true;
  return false;
}

function contentTypeLooksLikeHtmlOrJson(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  const ct = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return (
    ct === "text/html" ||
    ct === "application/json" ||
    ct === "application/problem+json" ||
    ct === "text/xml" ||
    ct === "application/xml" ||
    ct.startsWith("application/json")
  );
}

function pathExpectsPdf(urlOrPath: string | undefined | null): boolean {
  if (!urlOrPath) return false;
  const lower = urlOrPath.toLowerCase();
  return (
    lower.includes(".pdf") ||
    lower.includes("application/pdf") ||
    /\/[^/?#]+\.pdf(?:$|\?)/i.test(lower)
  );
}

type AcceptBytesOptions = {
  host?: string | null;
  contentType?: string | null;
  /** When true (PDF attach paths), require %PDF / image magic — never accept 200 HTML/JSON as success. */
  expectPdf?: boolean;
};

function acceptBytes(buf: Buffer, options?: AcceptBytesOptions | string | null): Buffer | null {
  // Back-compat: acceptBytes(buf, host) used to pass host as 2nd arg.
  const opts: AcceptBytesOptions =
    typeof options === "string" || options == null
      ? { host: options ?? null }
      : options;
  const host = opts.host ?? null;
  const contentType = opts.contentType ?? null;
  if (!buf.length) {
    setReadbackDiag({ reason: "empty", host, contentType });
    return null;
  }
  if (contentTypeLooksLikeHtmlOrJson(contentType) || looksLikeAuthErrorBody(buf)) {
    setReadbackDiag({
      reason: "auth_body",
      host,
      contentType,
      bodyPrefix: describeBodyPrefix(buf),
    });
    return null;
  }
  if (opts.expectPdf && !looksLikePdf(buf) && !looksLikeImageBuffer(buf)) {
    setReadbackDiag({
      reason: "non_pdf",
      host,
      contentType,
      bodyPrefix: describeBodyPrefix(buf),
    });
    return null;
  }
  return buf;
}

/** Build private CDN URL from RW token store id + pathname (same host put would use). */
export function privateBlobUrlForToken(pathname: string, token: string): string | null {
  const storeId = canonicalBlobStoreId(storeIdFromRwToken(token));
  if (!storeId) return null;
  const key = posixKey(pathname);
  if (!key) return null;
  return `https://${storeId}.private.blob.vercel-storage.com/${key}`;
}

async function readViaSdkGet(urlOrPathname: string): Promise<Buffer | null> {
  const auth = blobAuthOptions();
  const hostHint =
    /^https?:\/\//i.test(urlOrPathname)
      ? blobHostname(urlOrPathname)
      : (() => {
          const id = storeIdFromRwToken(auth.token ?? "");
          return id ? `${id}.private.blob.vercel-storage.com` : null;
        })();
  const expectPdf = pathExpectsPdf(urlOrPathname);
  const attempts: Array<{ access: "private"; useCache?: boolean }> = [
    { access: "private", useCache: false },
    { access: "private" },
  ];
  for (const opts of attempts) {
    try {
      const { get } = await import("@vercel/blob");
      const result = await get(urlOrPathname, { ...opts, ...auth });
      if (!result || result.statusCode !== 200 || !result.stream) {
        if (result == null) {
          setReadbackDiag({ reason: "http_status", status: 404, host: hostHint });
        }
        continue;
      }
      const buf = await streamToBuffer(result.stream);
      const contentType = result.blob?.contentType ?? result.headers?.get?.("content-type") ?? null;
      const ok = acceptBytes(buf, { host: hostHint, contentType, expectPdf });
      if (ok) return ok;
      // Bad body / empty — try next strategy (presign may still return real PDF bytes).
      if (result.blob?.size && result.blob.size > 0 && buf.length === 0) continue;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const statusMatch = /Failed to fetch blob:\s*(\d{3})/i.exec(message);
      if (statusMatch) {
        setReadbackDiag({
          reason: "http_status",
          status: Number(statusMatch[1]),
          host: hostHint,
        });
      }
      /* try next strategy */
    }
  }
  return null;
}

type BearerResult = { buf: Buffer | null; status?: number; host?: string | null };

/** Direct private CDN fetch with Bearer — RW token preferred; OIDC as last resort. */
async function bearerFetchOnce(url: string, bearer: string): Promise<BearerResult> {
  const host = blobHostname(url);
  const expectPdf = pathExpectsPdf(url);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      setReadbackDiag({ reason: "http_status", status: res.status, host, contentType });
      return { buf: null, status: res.status, host };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      buf: acceptBytes(buf, { host, contentType, expectPdf }),
      status: res.status,
      host,
    };
  } catch {
    setReadbackDiag({ reason: "empty", host });
    return { buf: null, host };
  }
}

async function readViaBearerFetch(url: string): Promise<Buffer | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  const rw = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (rw) {
    const viaRw = await bearerFetchOnce(url, rw);
    if (viaRw.buf) return viaRw.buf;
  }
  // OIDC put may have written to BLOB_STORE_ID; private CDN accepts VERCEL_OIDC_TOKEN.
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (oidc && oidc !== rw) {
    const viaOidc = await bearerFetchOnce(url, oidc);
    if (viaOidc.buf) return viaOidc.buf;
  }
  return null;
}

/**
 * Control-plane issueSignedToken + client-side presign, then fetch the signed CDN URL.
 * Uses the same explicit RW token as put when present (never OIDC fallthrough).
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
    const host = blobHostname(presignedUrl);
    const expectPdf = pathExpectsPdf(pathname) || pathExpectsPdf(presignedUrl);
    const res = await fetch(presignedUrl, { method: "GET", cache: "no-store" });
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      setReadbackDiag({ reason: "http_status", status: res.status, host, contentType });
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return acceptBytes(buf, { host, contentType, expectPdf });
  } catch {
    /* OIDC/token cannot issue, or CDN rejected signature */
  }
  return null;
}

async function readPrivateBlob(urlOrPathname: string): Promise<Buffer | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const isHttp = /^https?:\/\//i.test(urlOrPathname);
  const pathname = isHttp
    ? (blobPathnameDecoded(urlOrPathname) ?? blobPathnameFromUrl(urlOrPathname))
    : posixKey(urlOrPathname);

  // 1) Bearer on the given URL / constructed CDN URL (same RW token as put).
  //    HTML/JSON/non-PDF bodies are rejected so we fall through — never treat 200 HTML as PDF.
  if (token && isHttp) {
    const viaBearer = await readViaBearerFetch(urlOrPathname);
    if (viaBearer) return viaBearer;
    // Prefer ?download=1 next (put.downloadUrl shape) before other host variants.
    const downloadUrl = (() => {
      try {
        const u = new URL(urlOrPathname);
        u.hostname = u.hostname.toLowerCase();
        if (u.searchParams.get("download") === "1") return null;
        u.searchParams.set("download", "1");
        return u.toString();
      } catch {
        return null;
      }
    })();
    if (downloadUrl) {
      const viaDownload = await readViaBearerFetch(downloadUrl);
      if (viaDownload) return viaDownload;
    }
  } else if (token && pathname) {
    const constructed = privateBlobUrlForToken(pathname, token);
    if (constructed) {
      const viaConstructed = await readViaBearerFetch(constructed);
      if (viaConstructed) return viaConstructed;
      const viaDownload = await readViaBearerFetch(`${constructed}?download=1`);
      if (viaDownload) return viaDownload;
    }
  } else if (!token && isHttp) {
    const viaBearer = await readViaBearerFetch(urlOrPathname);
    if (viaBearer) return viaBearer;
  }

  // 2) SDK get with explicit RW token (useCache:false then default).
  const viaSdk = await readViaSdkGet(urlOrPathname);
  if (viaSdk) return viaSdk;
  if (pathname && pathname !== urlOrPathname) {
    const viaPathSdk = await readViaSdkGet(pathname);
    if (viaPathSdk) return viaPathSdk;
  }

  // 3) Presigned GET — different auth path than Bearer; often succeeds when CDN returns
  //    HTML/JSON error bodies to raw Bearer fetches.
  if (pathname) {
    const viaPresign = await readViaPresignedGet(pathname);
    if (viaPresign) return viaPresign;
  }

  // 4) Last Bearer host-normalization / token-constructed variants.
  if (token && isHttp) {
    const lowerHostUrl = (() => {
      try {
        const u = new URL(urlOrPathname);
        const lower = u.hostname.toLowerCase();
        if (lower === u.hostname) return null;
        u.hostname = lower;
        return u.toString();
      } catch {
        return null;
      }
    })();
    if (lowerHostUrl) {
      const viaLower = await readViaBearerFetch(lowerHostUrl);
      if (viaLower) return viaLower;
    }
    if (pathname) {
      const constructed = privateBlobUrlForToken(pathname, token);
      if (
        constructed &&
        constructed.toLowerCase() !== urlOrPathname.toLowerCase() &&
        constructed.toLowerCase() !== (lowerHostUrl ?? "").toLowerCase()
      ) {
        const viaConstructed = await readViaBearerFetch(constructed);
        if (viaConstructed) return viaConstructed;
      }
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
      const contentType = result.blob?.contentType ?? result.headers?.get?.("content-type") ?? null;
      const ok = acceptBytes(buf, {
        host: blobHostname(url),
        contentType,
        expectPdf: pathExpectsPdf(url),
      });
      if (ok) return ok;
    }
  } catch {
    /* public URL or older SDK */
  }
  const viaBearer = await readViaBearerFetch(url);
  if (viaBearer) return viaBearer;
  try {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      setReadbackDiag({
        reason: "http_status",
        status: res.status,
        host: blobHostname(url),
        contentType,
      });
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return acceptBytes(buf, {
      host: blobHostname(url),
      contentType,
      expectPdf: pathExpectsPdf(url),
    });
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
  const host = blobHostname(storagePath);
  if (looksLikeAuthErrorBody(bytes)) {
    setReadbackDiag({
      reason: "auth_body",
      host,
      bodyPrefix: describeBodyPrefix(bytes),
    });
    throw new Error(readbackFailureMessage());
  }
  if (pathExpectsPdf(storagePath) && !looksLikePdf(bytes) && !looksLikeImageBuffer(bytes)) {
    setReadbackDiag({
      reason: "non_pdf",
      host,
      bodyPrefix: describeBodyPrefix(bytes),
    });
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
      if (!lastReadbackDiag) {
        setReadbackDiag({ reason: "empty", host: blobHostname(storagePath) });
      }
      lastError = new Error(readbackFailureMessage());
      // HTML/JSON/non-PDF / non-404 HTTP are definitive — do not burn CDN visibility retries.
      if (
        lastReadbackDiag?.reason === "auth_body" ||
        lastReadbackDiag?.reason === "non_pdf" ||
        (lastReadbackDiag?.reason === "http_status" &&
          lastReadbackDiag.status != null &&
          lastReadbackDiag.status !== 404)
      ) {
        throw lastError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(readbackFailureMessage());
      if (
        lastReadbackDiag?.reason === "auth_body" ||
        lastReadbackDiag?.reason === "non_pdf" ||
        lastReadbackDiag?.reason === "store_mismatch" ||
        (lastReadbackDiag?.reason === "http_status" &&
          lastReadbackDiag.status != null &&
          lastReadbackDiag.status !== 404)
      ) {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error(readbackFailureMessage());
}

function assertPutUrlMatchesRwToken(putUrl: string): void {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return;
  const tokenStore = storeIdFromRwToken(token);
  const urlStore = storeIdFromBlobUrl(putUrl);
  const configured = normalizeBlobStoreId(process.env.BLOB_STORE_ID);
  const host = blobHostname(putUrl);

  // Store ids are case-insensitive — do not treat casing-only differences as a mismatch
  // (that falsely told users to recreate BLOB_READ_WRITE_TOKEN and skipped real read-back diags).
  if (tokenStore && urlStore && !sameBlobStoreId(tokenStore, urlStore)) {
    setReadbackDiag({
      reason: "store_mismatch",
      host,
      detail: `put host ${urlStore} vs RW token store ${tokenStore}`,
    });
    throw new Error(readbackFailureMessage());
  }
  if (tokenStore && configured && !sameBlobStoreId(tokenStore, configured)) {
    setReadbackDiag({
      reason: "store_mismatch",
      host,
      detail: `BLOB_STORE_ID ${configured} vs RW token store ${tokenStore}`,
    });
    // Do not throw yet — put may still be readable via the token. Surface on read failure.
  }
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
      const auth = blobAuthOptions();
      // Explicit token always — never rely on env default (OIDC wins over env RW token).
      const blob = await put(key, buffer, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: contentType || "application/octet-stream",
        ...auth,
      });
      if (blob?.url) {
        try {
          assertPutUrlMatchesRwToken(blob.url);
          // Private blobs: prefer put.downloadUrl first, then url, then pathname.
          // Each strategy rejects HTML/JSON/non-PDF and tries the next.
          const readbackTargets: string[] = [];
          if (blob.downloadUrl) readbackTargets.push(blob.downloadUrl);
          if (!readbackTargets.includes(blob.url)) readbackTargets.push(blob.url);
          if (blob.pathname && !readbackTargets.includes(blob.pathname)) {
            readbackTargets.push(blob.pathname);
          }

          let readable = false;
          let lastErr: Error | null = null;
          for (const target of readbackTargets) {
            try {
              await assertStoredFileReadable(target);
              readable = true;
              break;
            } catch (error) {
              lastErr = error instanceof Error ? error : new Error(readbackFailureMessage());
            }
          }
          if (!readable && blob.pathname) {
            try {
              const byPath = await readPrivateBlob(blob.pathname);
              if (byPath && byPath.length > 0) {
                expectDurableBytes(blob.url, byPath);
                readable = true;
              }
            } catch (error) {
              lastErr = error instanceof Error ? error : lastErr;
            }
          }
          if (!readable) {
            try {
              const { del } = await import("@vercel/blob");
              await del(blob.url, blobAuthOptions());
            } catch {
              /* best-effort cleanup */
            }
            if (requireRemote) {
              throw lastErr ?? new Error(readbackFailureMessage());
            }
            return writeLocalFile(key, buffer);
          }
        } catch (error) {
          if (requireRemote) {
            // Prefer latest read-back diagnosis over a stale early error string.
            throw new Error(readbackFailureMessage());
          }
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
