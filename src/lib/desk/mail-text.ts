/** Decode MIME header words and repair common UTF-8 mojibake (e.g. · → Ã‚Â·). */

const ENCODED_WORD = /=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g;

/** Windows-1252 code points that differ from latin1 (0x80–0x9F). */
const CP1252_FROM_UNICODE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

function decodeQuotedPrintableWord(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function decodeOneEncodedWord(charset: string, encoding: string, text: string): string {
  const cs = charset.trim().toLowerCase() || "utf-8";
  const enc = encoding.trim().toUpperCase();
  try {
    if (enc === "B") {
      const buf = Buffer.from(text.replace(/\s+/g, ""), "base64");
      return buf.toString(cs === "utf-8" || cs === "utf8" ? "utf8" : "utf8");
    }
    if (enc === "Q") {
      const raw = decodeQuotedPrintableWord(text);
      return Buffer.from(raw, "binary").toString(cs === "utf-8" || cs === "utf8" ? "utf8" : "utf8");
    }
  } catch {
    return text;
  }
  return text;
}

/** RFC 2047 encoded-word decode for Subject/From headers. */
export function decodeMimeWords(value: string | null | undefined): string {
  const input = value ?? "";
  if (!input.includes("=?")) return input;
  return input.replace(ENCODED_WORD, (_all, charset: string, encoding: string, text: string) =>
    decodeOneEncodedWord(charset, encoding, text),
  );
}

function unicodeToCp1252Byte(codePoint: number): number | null {
  if (codePoint <= 0xff && !(codePoint >= 0x80 && codePoint <= 0x9f)) return codePoint;
  return CP1252_FROM_UNICODE[codePoint] ?? null;
}

/** One step: treat the string as Windows-1252 text of UTF-8 bytes, then decode UTF-8. */
export function undoCp1252Utf8Mojibake(value: string): string | null {
  const bytes: number[] = [];
  for (const ch of value) {
    const b = unicodeToCp1252Byte(ch.codePointAt(0) ?? 0);
    if (b == null) return null;
    bytes.push(b);
  }
  try {
    const next = Buffer.from(bytes).toString("utf8");
    if (!next || next.includes("\uFFFD")) return null;
    return next;
  } catch {
    return null;
  }
}

/**
 * Repair double-encoded UTF-8 that shows as Ã‚Â· / Ã¢â‚¬ etc.
 * Walks CP1252→utf8 while the string still looks mojibake-ish.
 */
export function repairUtf8Mojibake(value: string | null | undefined): string {
  let out = value ?? "";
  for (let i = 0; i < 3; i += 1) {
    if (!/[ÃÂâ]/.test(out) && !out.includes("\u201A") && !out.includes("Â")) break;
    const next = undoCp1252Utf8Mojibake(out);
    if (!next || next === out) break;
    out = next;
  }
  return out;
}

/** Subject/snippet ready for CRM + Inbox display. */
export function decodeMailText(value: string | null | undefined): string {
  return repairUtf8Mojibake(decodeMimeWords(value)).trim();
}
