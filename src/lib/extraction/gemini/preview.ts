/** Short, single-line snapshot of a Gemini JSON object for mint error toasts. */
export function sanitizeGeminiPreview(json: unknown, maxLen = 280): string {
  const parts: string[] = [];
  const walk = (node: unknown, prefix: string, depth: number) => {
    if (parts.join("; ").length >= maxLen || depth > 3) return;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      const text = String(node).replace(/\s+/g, " ").trim();
      if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "n/a") return;
      if (text.length > 80 && /^[A-Za-z0-9+/=]+$/.test(text)) return;
      parts.push(`${prefix || "value"}=${text.slice(0, 40)}`);
      return;
    }
    if (Array.isArray(node)) {
      node.slice(0, 6).forEach((item, index) => walk(item, `${prefix}[${index}]`, depth + 1));
      return;
    }
    if (!node || typeof node !== "object") return;
    const rec = node as Record<string, unknown>;
    if ("value" in rec && (typeof rec.value === "string" || typeof rec.value === "number")) {
      walk(rec.value, prefix, depth);
      return;
    }
    for (const [key, value] of Object.entries(rec)) {
      if (key === "confidence") continue;
      walk(value, prefix ? `${prefix}.${key}` : key, depth + 1);
    }
  };
  walk(json, "", 0);
  const joined = parts.join("; ");
  return joined.length > maxLen ? `${joined.slice(0, maxLen - 1)}…` : joined;
}

export function readGeminiDocumentKind(json: unknown): string | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const raw = (json as { document_kind?: unknown }).document_kind;
  if (typeof raw === "string" && raw.trim()) return raw.trim().toLowerCase();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const value = (raw as { value?: unknown }).value;
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  return null;
}
