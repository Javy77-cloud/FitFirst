import { LEARNING_POOL_TERMS_VERSION } from "./terms";
import type { LearningPoolConsent } from "../types";

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `consent-${Date.now()}-${Math.random()}`;
}

/** Opt-out by default. No row means the agency has not agreed. */
export function createConsentStore() {
  const rows = new Map<string, LearningPoolConsent>();

  return {
    getByAgency(agencyId: string): LearningPoolConsent | null {
      return rows.get(agencyId) ?? null;
    },

    hasActiveConsent(agencyId: string): boolean {
      const row = rows.get(agencyId);
      return Boolean(row?.optedIn && row.agreedAt && row.termsVersion);
    },

    record(input: {
      agencyId: string;
      tenantId: string;
      optedIn: boolean;
      termsVersion?: string;
      at?: Date;
    }): LearningPoolConsent {
      const at = input.at ?? new Date();
      const row: LearningPoolConsent = {
        id: rows.get(input.agencyId)?.id ?? newId(),
        agencyId: input.agencyId,
        tenantId: input.tenantId,
        optedIn: input.optedIn,
        termsVersion: input.termsVersion ?? LEARNING_POOL_TERMS_VERSION,
        agreedAt: input.optedIn ? at : null,
        createdAt: rows.get(input.agencyId)?.createdAt ?? at,
      };
      rows.set(input.agencyId, row);
      return row;
    },

    list(): LearningPoolConsent[] {
      return [...rows.values()];
    },
  };
}

export type ConsentStore = ReturnType<typeof createConsentStore>;
