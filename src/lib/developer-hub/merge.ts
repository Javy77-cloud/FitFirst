export type MergeRecord = {
  id: string;
  module: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  coverageA?: string | number | null;
  status?: string | null;
};

export function mergeTokens(text: string, record: MergeRecord): string {
  const values: Record<string, string> = {
    "record.id": record.id,
    "record.module": record.module,
    "record.firstName": record.firstName ?? "",
    "record.lastName": record.lastName ?? "",
    "record.name":
      record.name ||
      [record.firstName, record.lastName].filter(Boolean).join(" ") ||
      record.title ||
      "",
    "record.title": record.title ?? "",
    "record.email": record.email ?? "",
    "record.phone": record.phone ?? "",
    "record.address": record.address ?? "",
    "record.city": record.city ?? "",
    "record.state": record.state ?? "",
    "record.zip": record.zip ?? "",
    "record.coverageA":
      record.coverageA == null || record.coverageA === "" ? "" : String(record.coverageA),
    "record.status": record.status ?? "",
  };
  return text.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (full, key: string) => {
    const mapped = values[key] ?? values[key.toLowerCase()];
    return mapped == null ? full : mapped;
  });
}

export function mapsUrlFor(record: MergeRecord): string {
  const q = [record.address, record.city, record.state, record.zip].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || record.name || record.id)}`;
}
