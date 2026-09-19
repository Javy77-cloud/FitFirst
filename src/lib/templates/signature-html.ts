import { AGENCY_BRAND } from "@/lib/domain";
import { mergeTemplate, type TemplateMergeValues } from "@/lib/templates/merge";

export const SIGNATURE_IMAGE_MAX_BYTES = 200 * 1024;

const ALLOWED_TAGS = new Set(["p", "br", "b", "strong", "i", "em", "u", "a", "img", "span", "div"]);

export const SIGNATURE_MERGE_CHIPS = [
  { key: "signature", label: "Signature" },
  { key: "agency_name", label: "Agency" },
  { key: "agent_phone", label: "Phone" },
  { key: "contact_first_name", label: "First name" },
] as const;

export function signatureLooksLikeHtml(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

/** Plain text becomes line-broken HTML. Existing markup is sanitized. */
export function signatureToPreviewHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (!signatureLooksLikeHtml(trimmed)) {
    return escapeHtml(trimmed).replace(/\n/g, "<br />");
  }
  return sanitizeSignatureHtml(trimmed);
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function sanitizeSignatureHtml(html: string): string {
  return html
    .replace(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[\s\S]*?>[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (_full, tag: string, rawAttrs: string) => {
      const name = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return "";
      if (name === "br") return "<br />";
      const closing = _full.startsWith("</");
      if (closing) return `</${name}>`;
      const attrs = sanitizeAttrs(name, rawAttrs);
      return `<${name}${attrs}>`;
    });
}

function sanitizeAttrs(tag: string, raw: string): string {
  const attrs: string[] = [];
  const re = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const key = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (key.startsWith("on")) continue;
    if (tag === "a" && key === "href" && /^(https?:|mailto:)/i.test(value)) {
      attrs.push(`href="${escapeHtml(value)}"`);
    }
    if (tag === "img" && key === "src" && /^(https?:|data:image\/)/i.test(value)) {
      attrs.push(`src="${escapeHtml(value)}"`);
    }
    if (tag === "img" && (key === "alt" || key === "width" || key === "height")) {
      attrs.push(`${key}="${escapeHtml(value)}"`);
    }
  }
  return attrs.length ? ` ${attrs.join(" ")}` : "";
}

export function sampleSignatureMergeValues(input?: {
  agentName?: string;
  signature?: string;
  agencyName?: string;
}): TemplateMergeValues {
  return {
    contactFirstName: "Marcus",
    agencyName: input?.agencyName || AGENCY_BRAND.name,
    policyType: "HO3",
    wonDate: new Date("2026-09-18T16:00:00.000Z"),
    agentPhone: AGENCY_BRAND.phone,
    signature: input?.signature || "",
  };
}

export function previewMergedSignature(body: string, extra?: { agencyName?: string; agentName?: string }): string {
  const values = sampleSignatureMergeValues({
    signature: "",
    agencyName: extra?.agencyName,
    agentName: extra?.agentName,
  });
  const raw = signatureLooksLikeHtml(body) ? sanitizeSignatureHtml(body) : body;
  const resolvedSig = mergeTemplate(raw, values);
  const sample = `Hi {{contact_first_name}} — {{agency_name}} on {{policy_type}}.\n\n{{signature}}`;
  return mergeTemplate(sample, { ...values, signature: resolvedSig });
}

export function isAllowedSignatureImage(file: { type: string; size: number }): { ok: true } | { ok: false; reason: string } {
  if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
    return { ok: false, reason: "Use PNG, JPEG, WebP, or GIF." };
  }
  if (file.size > SIGNATURE_IMAGE_MAX_BYTES) {
    return { ok: false, reason: "Keep logo or headshot under 200 KB." };
  }
  return { ok: true };
}
