import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { ZOHO_MODULES, type ImportFolderScan, type ZohoModule, type ZohoRecord } from "./types";

const FILE_ALIASES: Record<string, ZohoModule> = {
  contacts: "Contacts",
  contact: "Contacts",
  accounts: "Accounts",
  account: "Accounts",
  businesses: "Accounts",
  business: "Accounts",
  leads: "Leads",
  lead: "Leads",
  deals: "Deals",
  deal: "Deals",
  opportunities: "Deals",
  vendors: "Vendors",
  vendor: "Vendors",
  carriers: "Vendors",
  carrier: "Vendors",
  policies: "Policies",
  policy: "Policies",
  tasks: "Tasks",
  task: "Tasks",
};

export function defaultImportDir(): string {
  return process.env.ZOHO_IMPORT_DIR?.trim() || path.join(process.cwd(), "import", "zoho");
}

export function moduleFromFilename(filename: string): ZohoModule | null {
  const base = path.basename(filename).replace(/\.(jsonl|json)$/i, "");
  const cleaned = base.replace(/^zoho[-_]?/i, "").replace(/[-_]?export$/i, "");
  return FILE_ALIASES[cleaned.toLowerCase()] ?? null;
}

function isRecordObject(value: unknown): value is ZohoRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function recordsFromPayload(payload: unknown): ZohoRecord[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => recordsFromPayload(item));
  }
  if (!isRecordObject(payload)) return [];
  const data = payload.data ?? payload.records ?? payload.Rows;
  if (Array.isArray(data)) return data.filter(isRecordObject);
  if (payload.id != null || payload.Id != null || payload.zoho_id != null) return [payload];
  if (payload.First_Name != null || payload.Last_Name != null || payload.Deal_Name != null) {
    return [payload];
  }
  if (payload.Vendor_Name != null || payload.Account_Name != null || payload.Policy_Number != null) {
    return [payload];
  }
  if (payload.Subject != null && (payload.Who_Id != null || payload.What_Id != null || payload.Status != null)) {
    return [payload];
  }
  return [];
}

export function parseZohoJsonl(text: string): ZohoRecord[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const fromWhole = recordsFromPayload(parsed);
      if (fromWhole.length > 0) return fromWhole;
    } catch {
      // Fall through to line-oriented JSONL.
    }
  }
  const records: ZohoRecord[] = [];
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      throw new Error(`Invalid JSONL line: ${err instanceof Error ? err.message : String(err)}`);
    }
    records.push(...recordsFromPayload(parsed));
  }
  return records;
}

export async function scanImportFolder(dir = defaultImportDir()): Promise<ImportFolderScan> {
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return { dir, files: [], extraFiles: [], missingModules: [...ZOHO_MODULES] };
  }

  const files: ImportFolderScan["files"] = [];
  const extraFiles: string[] = [];
  const seen = new Set<ZohoModule>();

  for (const name of names) {
    if (name.startsWith(".")) continue;
    if (!/\.(jsonl|json)$/i.test(name)) continue;
    const module = moduleFromFilename(name);
    const full = path.join(dir, name);
    const info = await stat(full);
    if (!info.isFile()) continue;
    if (!module) {
      extraFiles.push(name);
      continue;
    }
    files.push({ module, filename: name, path: full, bytes: info.size });
    seen.add(module);
  }

  return {
    dir,
    files: files.sort((a, b) => a.module.localeCompare(b.module)),
    extraFiles,
    missingModules: ZOHO_MODULES.filter((module) => !seen.has(module)),
  };
}

export async function readModuleRecords(filePath: string): Promise<ZohoRecord[]> {
  const text = await readFile(filePath, "utf8");
  return parseZohoJsonl(text);
}
