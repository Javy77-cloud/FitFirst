import { accountDisplayName } from "./bind";

export type ColumnSpec = {
  id: string;
  label?: string;
  defaultVisible?: boolean;
};

export function resolveVisibleColumns(
  columns: Array<{ id: string; defaultVisible?: boolean }>,
  storedIds: string[] | null,
): string[] {
  const allowed = new Set(columns.map((column) => column.id));
  if (storedIds && storedIds.length > 0) {
    const picked = storedIds.filter((id) => allowed.has(id));
    if (picked.length > 0) return picked;
  }
  const defaults = columns.filter((column) => column.defaultVisible !== false).map((column) => column.id);
  return defaults.length > 0 ? defaults : [columns[0]!.id];
}

export function slugifyStage(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) return "stage";
  if (slug === "bound") return "bound-stage";
  return slug;
}

export type PolicyBook = "pc" | "life" | "health";
export type PcSubfilter = "all" | "home" | "auto" | "commercial";

const PC_LINES = new Set(["HO", "AUTO", "FLOOD", "UMBRELLA", "GL"]);

export function policyBook(line: string): PolicyBook {
  if (line === "LIFE") return "life";
  if (line === "HEALTH") return "health";
  return "pc";
}

export function pcSubfilter(line: string): Exclude<PcSubfilter, "all"> | null {
  if (policyBook(line) !== "pc") return null;
  if (line === "AUTO") return "auto";
  if (line === "GL") return "commercial";
  return "home";
}

export function matchesPolicyFilters(
  line: string,
  book: PolicyBook | "all",
  sub: PcSubfilter,
): boolean {
  const actual = policyBook(line);
  if (book !== "all" && actual !== book) return false;
  if (book === "pc" && sub !== "all" && pcSubfilter(line) !== sub) return false;
  return true;
}

export function insuredContactName(input: {
  primaryNamedInsured?: string | null;
  secondaryNamedInsured?: string | null;
  contact?: {
    accountKind?: string | null;
    legalName?: string | null;
    firstName: string;
    lastName: string;
  } | null;
  lead?: { firstName: string; lastName: string } | null;
}): string {
  if (input.primaryNamedInsured?.trim()) {
    return input.secondaryNamedInsured?.trim()
      ? `${input.primaryNamedInsured.trim()} · ${input.secondaryNamedInsured.trim()}`
      : input.primaryNamedInsured.trim();
  }
  if (input.contact) return accountDisplayName(input.contact);
  if (input.lead) return `${input.lead.lastName}, ${input.lead.firstName}`;
  return "—";
}

export function columnStorageKey(tableId: string): string {
  return `ff-cols:${tableId}`;
}

export function insuredHref(input: {
  contactId?: string | null;
  leadId?: string | null;
}): string | null {
  if (input.contactId) return `/contacts/${input.contactId}`;
  if (input.leadId) return `/leads/${input.leadId}`;
  return null;
}

export const POLICY_BOOKS = [
  { id: "all", label: "All books" },
  { id: "pc", label: "P&C" },
  { id: "life", label: "Life" },
  { id: "health", label: "Health" },
] as const;

export const PC_SUBFILTERS = [
  { id: "all", label: "All P&C" },
  { id: "home", label: "Home" },
  { id: "auto", label: "Auto" },
  { id: "commercial", label: "Commercial" },
] as const;

export function parsePolicyBook(value: string | undefined): PolicyBook | "all" {
  if (value === "pc" || value === "life" || value === "health") return value;
  return "all";
}

export function parsePcSubfilter(value: string | undefined): PcSubfilter {
  if (value === "home" || value === "auto" || value === "commercial") return value;
  return "all";
}

export const OUTREACH_KINDS = ["call", "sms", "email", "task"] as const;
export type OutreachKind = (typeof OUTREACH_KINDS)[number];

export function isOutreachKind(value: string): value is OutreachKind {
  return (OUTREACH_KINDS as readonly string[]).includes(value);
}

export function outreachLabel(kind: OutreachKind): string {
  switch (kind) {
    case "call":
      return "Call";
    case "sms":
      return "SMS";
    case "email":
      return "Email";
    case "task":
      return "Task";
  }
}
