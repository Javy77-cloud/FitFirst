export const DEFAULT_TAG_PICKER_COLOR = "#1d4e89";

export type TagColorMap = Record<string, string>;

export function normalizeTagColor(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function serializeTagColors(colors: TagColorMap): string {
  return Object.entries(colors)
    .flatMap(([name, color]) => {
      const hex = normalizeTagColor(color);
      return hex ? [`${name}:${hex}`] : [];
    })
    .join(",");
}

export function parseTagColors(raw: unknown): TagColorMap {
  const text =
    typeof raw === "string"
      ? raw
      : raw && typeof raw === "object"
        ? JSON.stringify(raw)
        : "";
  const out: TagColorMap = {};
  for (const part of text.split(",")) {
    const cut = part.indexOf(":");
    if (cut <= 0) continue;
    const name = part.slice(0, cut).trim().toLowerCase();
    const hex = normalizeTagColor(part.slice(cut + 1));
    if (!name || !hex) continue;
    out[name] = hex;
  }
  return out;
}

export function parseTagColorsFromForm(form: FormData, key = "tagColors"): TagColorMap {
  return parseTagColors(form.get(key));
}

export function contrastTextOn(bg: string): "#ffffff" | "#0f1b2d" {
  const hex = normalizeTagColor(bg) ?? DEFAULT_TAG_PICKER_COLOR;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? "#0f1b2d" : "#ffffff";
}

export function colorsFromModuleTags(rows: { name: string; color: string | null }[]): TagColorMap {
  const out: TagColorMap = {};
  for (const row of rows) {
    if (row.color) out[row.name] = row.color;
  }
  return out;
}

export function tagChipStyle(color: string | null | undefined): { backgroundColor: string; color: string } | undefined {
  const hex = normalizeTagColor(color);
  if (!hex) return undefined;
  return { backgroundColor: hex, color: contrastTextOn(hex) };
}
