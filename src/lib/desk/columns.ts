export type ColumnDef = {
  key: string;
  label: string;
  defaultOn?: boolean;
};

export const TABLE_COLUMNS: Record<string, ColumnDef[]> = {
  leads: [
    { key: "name", label: "Name", defaultOn: true },
    { key: "status", label: "Status", defaultOn: true },
    { key: "source", label: "Source", defaultOn: true },
    { key: "line", label: "Insurance", defaultOn: true },
    { key: "phone", label: "Phone", defaultOn: true },
    { key: "email", label: "Email", defaultOn: true },
    { key: "created", label: "Created", defaultOn: false },
    { key: "action", label: "Shop", defaultOn: true },
  ],
  deals: [
    { key: "title", label: "Deal", defaultOn: true },
    { key: "stage", label: "Stage", defaultOn: true },
    { key: "line", label: "Line", defaultOn: true },
    { key: "state", label: "State", defaultOn: true },
    { key: "contact", label: "Contact", defaultOn: true },
    { key: "phone", label: "Phone", defaultOn: true },
    { key: "email", label: "Email", defaultOn: false },
    { key: "assigned", label: "Assigned", defaultOn: true },
    { key: "premium", label: "Coverage $", defaultOn: false },
    { key: "updated", label: "Updated", defaultOn: false },
    { key: "comms", label: "Comms", defaultOn: true },
  ],
  contacts: [
    { key: "name", label: "Name", defaultOn: true },
    { key: "status", label: "Status", defaultOn: true },
    { key: "phone", label: "Phone", defaultOn: true },
    { key: "email", label: "Email", defaultOn: true },
    { key: "city", label: "City", defaultOn: true },
    { key: "assigned", label: "Assigned", defaultOn: true },
    { key: "lifetime", label: "Lifetime", defaultOn: true },
    { key: "inForce", label: "In-force", defaultOn: true },
  ],
  accounts: [
    { key: "name", label: "Business", defaultOn: true },
    { key: "status", label: "Status", defaultOn: true },
    { key: "ein", label: "EIN", defaultOn: true },
    { key: "phone", label: "Phone", defaultOn: true },
    { key: "city", label: "City", defaultOn: true },
    { key: "employees", label: "Employees", defaultOn: false },
    { key: "lifetime", label: "Lifetime", defaultOn: true },
    { key: "inForce", label: "In-force", defaultOn: true },
  ],
  policies: [
    { key: "number", label: "Policy", defaultOn: true },
    { key: "status", label: "Status", defaultOn: true },
    { key: "insured", label: "Insured", defaultOn: true },
    { key: "line", label: "Line", defaultOn: true },
    { key: "carrier", label: "Carrier", defaultOn: true },
    { key: "premium", label: "Premium", defaultOn: true },
    { key: "effective", label: "Effective", defaultOn: false },
    { key: "expires", label: "Expires", defaultOn: true },
    { key: "assigned", label: "Assigned", defaultOn: false },
  ],
  carriers: [
    { key: "name", label: "Carrier", defaultOn: true },
    { key: "portalLogin", label: "Portal login", defaultOn: true },
    { key: "csPhone", label: "Customer service", defaultOn: true },
    { key: "agentPhone", label: "Agent phone", defaultOn: true },
    { key: "website", label: "Website / portal", defaultOn: true },
    { key: "info", label: "Carrier info", defaultOn: true },
    { key: "lines", label: "Lines", defaultOn: false },
  ],
  tasks: [
    { key: "title", label: "Task", defaultOn: true },
    { key: "due", label: "Due", defaultOn: true },
    { key: "status", label: "Status", defaultOn: true },
    { key: "kind", label: "Kind", defaultOn: true },
    { key: "related", label: "Related", defaultOn: true },
  ],
};

export function defaultColumns(tableKey: string): string[] {
  return (TABLE_COLUMNS[tableKey] ?? []).filter((c) => c.defaultOn !== false).map((c) => c.key);
}

export function parseColumns(tableKey: string, raw: string | null | undefined): string[] {
  const allowed = new Set((TABLE_COLUMNS[tableKey] ?? []).map((c) => c.key));
  const picked = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => allowed.has(s));
  return picked.length ? picked : defaultColumns(tableKey);
}
