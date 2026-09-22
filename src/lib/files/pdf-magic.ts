/**
 * Client-safe PDF magic helpers (no node:zlib).
 * Shared by View preview checks and server looksLikePdf.
 */

/** True when `%PDF` appears in the first 1KB, allowing leading BOM/whitespace/junk. */
export function hasPdfMagicInHead(bytes: Uint8Array | Buffer): boolean {
  const limit = Math.min(bytes.length, 1024);
  if (limit < 4) return false;
  for (let i = 0; i <= limit - 4; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 // F
    ) {
      if (i + 4 >= bytes.length) return false;
      const next = bytes[i + 4]!;
      // `%PDF-` or `%PDF1` / `%PDF2` …
      if (next === 0x2d) return true;
      if (next >= 0x30 && next <= 0x39) return true;
    }
  }
  return false;
}

/**
 * Index of `%PDF` magic in the first 1KB, or -1.
 * Used to strip BOM/leading junk before serving so browser PDF viewers mount cleanly.
 */
export function pdfMagicOffset(bytes: Uint8Array | Buffer): number {
  const limit = Math.min(bytes.length, 1024);
  if (limit < 4) return -1;
  for (let i = 0; i <= limit - 4; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46
    ) {
      if (i + 4 >= bytes.length) return -1;
      const next = bytes[i + 4]!;
      if (next === 0x2d || (next >= 0x30 && next <= 0x39)) return i;
    }
  }
  return -1;
}

/** Slice buffer so it starts at `%PDF` when magic was preceded by BOM/junk. */
export function stripLeadingJunkBeforePdf(bytes: Buffer): Buffer {
  const offset = pdfMagicOffset(bytes);
  if (offset <= 0) return bytes;
  return Buffer.from(bytes.subarray(offset));
}
