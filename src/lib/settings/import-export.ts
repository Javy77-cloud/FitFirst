export const IMPORT_EXPORT_PACK_IDS = [
  "contacts",
  "accounts",
  "policies",
  "carriers",
  "leads",
  "deals",
  "activities",
  "documents",
  "commissions",
  "quote-sheets",
] as const;

export type ImportExportPackId = (typeof IMPORT_EXPORT_PACK_IDS)[number];

export type ImportExportPack = {
  id: ImportExportPackId;
  label: string;
  group: "core" | "related";
  blurb: string;
  importStatus: "placeholder";
  exportStatus: "csv" | "json" | "placeholder";
  exportHref?: string;
  importHref: string;
};

/** Typical CRM / AMS / rater packs. CSV import is a placeholder until that slice merges. */
export const IMPORT_EXPORT_PACKS: ImportExportPack[] = [
  {
    id: "contacts",
    label: "Contacts",
    group: "core",
    blurb: "People on the book. Encrypted SSN stays off the file.",
    importStatus: "placeholder",
    exportStatus: "csv",
    exportHref: "/api/v1/export/contacts.csv",
    importHref: "/settings/import?pack=contacts",
  },
  {
    id: "accounts",
    label: "Accounts",
    group: "core",
    blurb: "Commercial accounts. Encrypted EIN stays off the file.",
    importStatus: "placeholder",
    exportStatus: "placeholder",
    importHref: "/settings/import?pack=accounts",
  },
  {
    id: "policies",
    label: "Policies",
    group: "core",
    blurb: "Bound / active / pending only as they exist. Quotes are not coverage.",
    importStatus: "placeholder",
    exportStatus: "csv",
    exportHref: "/api/v1/export/policies.csv",
    importHref: "/settings/import?pack=policies",
  },
  {
    id: "carriers",
    label: "Carriers",
    group: "core",
    blurb: "Appointed markets. Portal usernames and passwords stay in the vault.",
    importStatus: "placeholder",
    exportStatus: "placeholder",
    importHref: "/settings/import?pack=carriers",
  },
  {
    id: "leads",
    label: "Leads",
    group: "core",
    blurb: "Inbound people before a shop. Match on name + phone or email — do not duplicate.",
    importStatus: "placeholder",
    exportStatus: "placeholder",
    importHref: "/settings/import?pack=leads",
  },
  {
    id: "deals",
    label: "Deals",
    group: "core",
    blurb: "Shopping records and pipeline stage. JSON list is live; CSV import is a stub.",
    importStatus: "placeholder",
    exportStatus: "json",
    exportHref: "/api/v1/deals",
    importHref: "/settings/import?pack=deals",
  },
  {
    id: "activities",
    label: "Activities / Tasks",
    group: "related",
    blurb: "Tasks, meetings, and logged calls with related-record FKs.",
    importStatus: "placeholder",
    exportStatus: "json",
    exportHref: "/api/v1/activities",
    importHref: "/settings/import?pack=activities",
  },
  {
    id: "documents",
    label: "Documents metadata",
    group: "related",
    blurb: "File name, slot, and related record — not the PDF bytes.",
    importStatus: "placeholder",
    exportStatus: "placeholder",
    importHref: "/settings/import?pack=documents",
  },
  {
    id: "commissions",
    label: "Commissions",
    group: "related",
    blurb: "Producer amounts and rates. No bank or card numbers.",
    importStatus: "placeholder",
    exportStatus: "csv",
    exportHref: "/api/v1/export/commissions.csv",
    importHref: "/settings/import?pack=commissions",
  },
  {
    id: "quote-sheets",
    label: "Quote sheets",
    group: "related",
    blurb: "Shopping worksheet stubs. Quotes are not coverage. Ana stays unbound.",
    importStatus: "placeholder",
    exportStatus: "placeholder",
    importHref: "/settings/import?pack=quote-sheets",
  },
];

export const IMPORT_EXPORT_HUB_HREF = "/settings/import-export";
export const IMPORT_HREF = "/settings/import";
export const EXPORT_HREF = "/settings/export";

export function importExportPack(id: string | undefined): ImportExportPack | undefined {
  if (!id) return undefined;
  return IMPORT_EXPORT_PACKS.find((pack) => pack.id === id);
}

export function coreImportExportPacks() {
  return IMPORT_EXPORT_PACKS.filter((pack) => pack.group === "core");
}

export function relatedImportExportPacks() {
  return IMPORT_EXPORT_PACKS.filter((pack) => pack.group === "related");
}
