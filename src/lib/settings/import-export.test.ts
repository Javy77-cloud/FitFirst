import { describe, expect, it } from "vitest";
import {
  coreImportExportPacks,
  IMPORT_EXPORT_PACK_IDS,
  IMPORT_EXPORT_PACKS,
  importExportPack,
  relatedImportExportPacks,
} from "./import-export";

describe("import / export packs", () => {
  it("covers the typical CRM / AMS / rater book", () => {
    expect([...IMPORT_EXPORT_PACK_IDS]).toEqual([
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
    ]);
    expect(coreImportExportPacks().map((pack) => pack.id)).toEqual([
      "contacts",
      "accounts",
      "policies",
      "carriers",
      "leads",
      "deals",
    ]);
    expect(relatedImportExportPacks().map((pack) => pack.id)).toEqual([
      "activities",
      "documents",
      "commissions",
      "quote-sheets",
    ]);
  });

  it("keeps live CSV on contacts, policies, and commissions only", () => {
    expect(importExportPack("contacts")?.exportHref).toBe("/api/v1/export/contacts.csv");
    expect(importExportPack("policies")?.exportHref).toBe("/api/v1/export/policies.csv");
    expect(importExportPack("commissions")?.exportHref).toBe("/api/v1/export/commissions.csv");
    expect(IMPORT_EXPORT_PACKS.filter((pack) => pack.exportStatus === "csv")).toHaveLength(3);
  });

  it("points every import at the placeholder hub route, not a missing sibling page", () => {
    expect(IMPORT_EXPORT_PACKS.every((pack) => pack.importStatus === "placeholder")).toBe(true);
    expect(IMPORT_EXPORT_PACKS.every((pack) => pack.importHref.startsWith("/settings/import"))).toBe(true);
    expect(IMPORT_EXPORT_PACKS.every((pack) => !pack.importHref.includes("/settings/developer"))).toBe(true);
  });
});
