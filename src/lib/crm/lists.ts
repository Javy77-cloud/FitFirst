import { accountDisplayName } from "./bind";

export type ColumnSpec = {
  id: string;
  label?: string;
  defaultVisible?: boolean;
  /** New linked fields join an existing saved layout so agents do not hide them by accident. */
  promoteIfMissing?: boolean;
};

export type LayoutSource = "agent" | "agency" | "code";

function codeDefaultIds(columns: Array<{ id: string; defaultVisible?: boolean }>): string[] {
  const defaults = columns.filter((column) => column.defaultVisible !== false).map((column) => column.id);
  return defaults.length > 0 ? defaults : [columns[0]!.id];
}

function sanitizeColumnIds(
  columns: Array<{
    id: string;
    defaultVisible?: boolean;
    hideable?: boolean;
    promoteIfMissing?: boolean;
  }>,
  storedIds: string[] | null | undefined,
): string[] | null {
  if (!storedIds || storedIds.length === 0) return null;
  const allowed = new Set(columns.map((column) => column.id));
  const picked = storedIds.filter((id) => allowed.has(id));
  if (picked.length === 0) return null;
  const required = columns.filter((column) => column.hideable === false).map((column) => column.id);
  const next = [...picked];
  for (const id of required) {
    if (!next.includes(id)) next.unshift(id);
  }
  for (const column of columns) {
    if (column.promoteIfMissing && column.defaultVisible !== false && !next.includes(column.id)) {
      next.push(column.id);
    }
  }
  return next;
}

/** Agent override wins, then agency default, then code defaults. */
export function resolveColumnLayout(
  columns: Array<{ id: string; defaultVisible?: boolean; hideable?: boolean }>,
  input: { agentIds?: string[] | null; agencyIds?: string[] | null },
): { ids: string[]; source: LayoutSource } {
  const agent = sanitizeColumnIds(columns, input.agentIds);
  if (agent) return { ids: agent, source: "agent" };
  const agency = sanitizeColumnIds(columns, input.agencyIds);
  if (agency) return { ids: agency, source: "agency" };
  return { ids: codeDefaultIds(columns), source: "code" };
}

export function resolveVisibleColumns(
  columns: Array<{ id: string; defaultVisible?: boolean; hideable?: boolean }>,
  storedIds: string[] | null,
): string[] {
  return resolveColumnLayout(columns, { agentIds: storedIds, agencyIds: null }).ids;
}

export function moveColumn(ids: string[], id: string, direction: -1 | 1): string[] {
  const index = ids.indexOf(id);
  if (index < 0) return ids;
  const next = index + direction;
  if (next < 0 || next >= ids.length) return ids;
  const copy = [...ids];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item!);
  return copy;
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

export function columnStorageKey(tableId: string, agentId?: string): string {
  return agentId ? `ff-cols:${agentId}:${tableId}` : `ff-cols:${tableId}`;
}

export function riskAddress(risk: {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
} | null | undefined): string | null {
  if (!risk) return null;
  const line = [risk.address1, [risk.city, risk.state].filter(Boolean).join(", "), risk.zip]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
  return line || null;
}

export type DealListFilter = {
  q?: string;
  stage?: string;
  line?: string;
  state?: string;
};

export function parseDealFilter(input: {
  q?: string;
  stage?: string;
  line?: string;
  state?: string;
}): DealListFilter {
  return {
    q: input.q?.trim() || undefined,
    stage: input.stage && input.stage !== "all" ? input.stage : undefined,
    line: input.line && input.line !== "all" ? input.line : undefined,
    state: input.state?.trim() || undefined,
  };
}

export function matchesDealFilters(
  input: {
    title: string;
    pipelineStage: string;
    lineOfBusiness: string;
    state: string;
    insured: string;
    phone?: string | null;
    email?: string | null;
    city?: string | null;
  },
  filter: DealListFilter,
): boolean {
  if (filter.stage && filter.stage !== "all" && input.pipelineStage !== filter.stage) return false;
  if (filter.line && filter.line !== "all" && input.lineOfBusiness !== filter.line) return false;
  if (filter.state?.trim() && input.state.toUpperCase() !== filter.state.trim().toUpperCase()) {
    return false;
  }
  const q = filter.q?.trim().toLowerCase();
  if (!q) return true;
  const hay = [input.title, input.insured, input.phone, input.email, input.city]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function telHref(phone?: string | null): string | null {
  if (!phone?.trim()) return null;
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function mailtoHref(email?: string | null): string | null {
  if (!email?.trim()) return null;
  return `mailto:${email.trim()}`;
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
