import type { RawCorrection, RawDocument, RawExtraction } from "../types";

/**
 * Per-agency raw layer. Records stay inside the tenant wall forever.
 * This store never exports rows to the global pool.
 */
export function createRawTenantStore() {
  const documents = new Map<string, RawDocument>();
  const extractions = new Map<string, RawExtraction>();
  const corrections = new Map<string, RawCorrection>();

  function assertTenant(tenantId: string, rowTenantId: string) {
    if (rowTenantId !== tenantId) {
      throw new Error("Raw learning records cannot leave their agency tenant.");
    }
  }

  return {
    layer: "raw" as const,

    putDocument(row: RawDocument) {
      documents.set(row.id, row);
      return row;
    },

    putExtraction(row: RawExtraction) {
      documents.get(row.documentId);
      extractions.set(row.id, row);
      return row;
    },

    putCorrection(row: RawCorrection) {
      corrections.set(row.id, row);
      return row;
    },

    listDocuments(tenantId: string): RawDocument[] {
      return [...documents.values()].filter((row) => {
        assertTenant(tenantId, row.tenantId);
        return true;
      });
    },

    listExtractions(tenantId: string): RawExtraction[] {
      return [...extractions.values()].filter((row) => row.tenantId === tenantId);
    },

    listCorrections(tenantId: string): RawCorrection[] {
      return [...corrections.values()].filter((row) => row.tenantId === tenantId);
    },

    getCorrection(tenantId: string, id: string): RawCorrection | null {
      const row = corrections.get(id);
      if (!row || row.tenantId !== tenantId) return null;
      return row;
    },

    /** Raw export is forbidden — use the anonymization layer. */
    exportOutsideTenant(): never {
      throw new Error("Raw learning records never leave the agency tenant wall.");
    },
  };
}

export type RawTenantStore = ReturnType<typeof createRawTenantStore>;
