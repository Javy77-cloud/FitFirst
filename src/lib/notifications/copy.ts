import { scrubRawProductKeys } from "@/lib/deals/product-chip-label";
import { displayNoticeBody } from "@/lib/coverage/notices";

/** Panel title. `Gloria Martinez · home~homeowners~88uvyj` becomes `Gloria Martinez · HO3`. */
export function formatNotificationTitle(title: string): string {
  return scrubRawProductKeys(title);
}

/** Visible body. Strips the panel machine key, then any raw product key. */
export function formatNotificationBody(body: string): string {
  return scrubRawProductKeys(displayNoticeBody(body));
}

/** Name · product. A storage key is the form label. Plain LOB text stays. */
export function formatPanelEntityLine(name: string, product: string | null | undefined): string {
  const raw = (product ?? "").trim();
  if (!raw) return name;
  if (!raw.includes("~")) return `${name} · ${raw}`;
  const label = scrubRawProductKeys(raw);
  return label ? `${name} · ${label}` : name;
}
