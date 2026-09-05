import type { ZohoRecord } from "./types";

const SYSTEM_EXACT = new Set([
  "id",
  "Owner",
  "Tag",
  "Record_Image",
  "Locked__s",
  "Record_Status__s",
  "Created_Time",
  "Created_By",
  "Modified_Time",
  "Modified_By",
  "Last_Activity_Time",
  "Change_Log_Time__s",
  "Unsubscribed_Mode",
  "Unsubscribed_Time",
  "Territories",
  "Enrich_Status__s",
  "Last_Enriched_Time__s",
  "Last_Visited_Time",
  "First_Visited_URL",
  "Average_Time_Spent_Minutes",
  "Number_Of_Chats",
  "Referrer",
  "Visitor_Score",
  "First_Visited_Time",
  "Days_Visited",
  "nearby_distance__s",
  "Full_Name",
]);

export function isSystemZohoField(key: string): boolean {
  if (!key) return true;
  if (key.startsWith("$")) return true;
  if (SYSTEM_EXACT.has(key)) return true;
  if (/_(Latitude|Longitude|Coordinates)$/i.test(key)) return true;
  return false;
}

export function zohoIdOf(record: ZohoRecord): string | null {
  const raw = record.id ?? record.Id ?? record.zoho_id;
  if (raw == null) return null;
  const text = String(raw).trim();
  return text || null;
}

export function lookupId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text || null;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const id = rec.id ?? rec.Id ?? rec.zoho_id;
    if (id == null) return null;
    const text = String(id).trim();
    return text || null;
  }
  return null;
}

export function lookupName(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const name = rec.name ?? rec.Name ?? rec.Vendor_Name ?? rec.Account_Name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return null;
}

export function lookupEmail(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    return text.includes("@") ? text : null;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const email = rec.email ?? rec.Email;
    if (typeof email === "string" && email.trim()) return email.trim();
  }
  return null;
}

export function lookupModule(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const module = rec.module ?? rec.$se_module ?? rec.api_name;
  return typeof module === "string" && module.trim() ? module.trim() : null;
}

export function asText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map((item) => asText(item)).filter((item): item is string => Boolean(item));
    return parts.length ? parts.join(", ") : null;
  }
  const name = lookupName(value);
  if (name) return name;
  return null;
}

export function firstText(record: ZohoRecord, keys: string[]): string | null {
  for (const key of keys) {
    const text = asText(record[key]);
    if (text) return text;
  }
  return null;
}

export function asBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(text)) return true;
    if (["false", "no", "n", "0"].includes(text)) return false;
  }
  return null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,]/g, "").trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function asStringList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).filter((item): item is string => Boolean(item));
  }
  const text = asText(value);
  if (!text) return [];
  return text
    .split(/[|,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function asDate(value: unknown): Date | null {
  const text = asText(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T12:00:00.000Z`);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function asDateOnly(value: unknown): string | null {
  const text = asText(value);
  if (!text) return null;
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function normalizeCarrierName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(insurance|ins|inc|llc|ltd|corp|company|co)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitName(full: string | null): { first: string; last: string } {
  const text = full?.trim() ?? "";
  if (!text) return { first: "Unknown", last: "Unknown" };
  const parts = text.split(/\s+/);
  if (parts.length === 1) return { first: parts[0] ?? "Unknown", last: "Unknown" };
  return { first: parts[0] ?? "Unknown", last: parts.slice(1).join(" ") };
}

export function addMonths(start: Date, months: number): Date {
  const next = new Date(start.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function parseTermMonths(value: unknown): number {
  const n = asNumber(value);
  if (n && n > 0 && n < 120) return Math.round(n);
  const text = asText(value)?.toLowerCase() ?? "";
  const match = text.match(/(\d+)\s*month/);
  if (match) return Number(match[1]);
  if (text.includes("6")) return 6;
  return 12;
}

export function presentKeys(record: ZohoRecord): string[] {
  return Object.keys(record).filter((key) => {
    const value = record[key];
    if (value == null) return false;
    if (typeof value === "string" && !value.trim()) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
}
