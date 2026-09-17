import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "@/lib/import-export/csv";
import type { LifeMatrixCarrierContact } from "./carriers";

/** Javy live Google Sheet (viewer). Official File→Download is blocked; gviz/htmlview works. */
export const LIFE_SHEET_ID = "1vd7cjSb3wB6FlH--YrLfzVur3XOclbYSAp8hP_rhuNs";
export const LIFE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${LIFE_SHEET_ID}/edit`;

export const LIFE_SHEET_TABS = [
  { name: "Matrix", gid: "1294218144", role: "condition_product" },
  { name: "Living Benefits", gid: "2080224818", role: "living_benefits" },
  { name: "AMAM", gid: "1726646464", role: "build_chart" },
  { name: "Americo", gid: "106655517", role: "build_chart" },
  { name: "Corebridge", gid: "937842887", role: "build_chart" },
  { name: "Foresters", gid: "1561762943", role: "build_chart" },
  { name: "F&G", gid: "1970337834", role: "build_chart" },
  { name: "LGA/Banner", gid: "1972246219", role: "build_chart" },
  { name: "MOO", gid: "314748925", role: "build_chart" },
  { name: "NLG", gid: "1533255219", role: "build_chart" },
  { name: "Royal Neighbors", gid: "605976454", role: "build_chart" },
  { name: "SBLI", gid: "2041715161", role: "build_chart" },
  { name: "Trans Am", gid: "1515597650", role: "build_chart" },
  { name: "UHL", gid: "1817919259", role: "build_chart" },
  { name: "Contracting and Licensing", gid: "1390562563", role: "ops" },
  { name: "State Licensing Fees", gid: "1884737408", role: "ops" },
  { name: "Carrier Rep Contact List", gid: "1946844538", role: "contacts" },
  { name: "Downline Debit Balances", gid: "2136078337", role: "ops" },
] as const;

export const LIFE_CONTACTS_CSV = "data/appetite/fitfirst-life-contacts.csv";
export const LIFE_SHEET_DROP_DIR = "data/appetite/life-sheet";

export type LifeSheetTabRole = (typeof LIFE_SHEET_TABS)[number]["role"];

export type LifeContactRow = {
  carrierSlug: string;
  carrierName: string;
  repName: string;
  repEmail: string;
  repPhone: string;
  phone: string;
  agentPhone: string;
  website: string;
  portalUrl: string;
  contractingEmail: string;
  notes: string;
  source: string;
};

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = String(row[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

export function parseLifeContactsCsv(text: string): LifeContactRow[] {
  const { rows } = parseCsv(text);
  const out: LifeContactRow[] = [];
  for (const row of rows) {
    const carrierSlug = cell(row, "carrier_slug");
    const carrierName = cell(row, "carrier_name");
    if (!carrierSlug && !carrierName) continue;
    out.push({
      carrierSlug,
      carrierName,
      repName: cell(row, "rep_name"),
      repEmail: cell(row, "rep_email"),
      repPhone: cell(row, "rep_phone"),
      phone: cell(row, "phone"),
      agentPhone: cell(row, "agent_phone"),
      website: cell(row, "website"),
      portalUrl: cell(row, "portal_url"),
      contractingEmail: cell(row, "contracting_email"),
      notes: cell(row, "notes"),
      source: cell(row, "source") || "live_sheet_contacts",
    });
  }
  return out;
}

function loadText(rel: string): string | null {
  const full = path.join(process.cwd(), rel);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf8");
}

export function loadLifeContacts(): LifeContactRow[] {
  const dropped = loadText(path.join(LIFE_SHEET_DROP_DIR, "contacts.csv"));
  const packed = loadText(LIFE_CONTACTS_CSV);
  return parseLifeContactsCsv(dropped ?? packed ?? "");
}

/** Drop extracted Matrix / contacts / build CSVs here — parsers pick them up. */
export function listLifeSheetDrops(): string[] {
  const dir = path.join(process.cwd(), LIFE_SHEET_DROP_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".tsv"))
    .sort();
}

export function overlayLifeCarrierContact(
  base: LifeMatrixCarrierContact,
  row: LifeContactRow | undefined,
): LifeMatrixCarrierContact {
  if (!row) return base;
  const extra = [row.repName && `Rep ${row.repName}`, row.repEmail, row.repPhone, row.contractingEmail, row.notes]
    .filter(Boolean)
    .join(". ");
  return {
    ...base,
    phone: row.phone || base.phone,
    agentPhone: row.agentPhone || row.phone || base.agentPhone,
    website: row.website || base.website,
    portalUrl: row.portalUrl || base.portalUrl,
    agentPortalUrl: row.portalUrl || base.agentPortalUrl,
    carrierInfo: extra
      ? `${base.carrierInfo} Sheet contacts: ${extra}`
      : base.carrierInfo,
  };
}
