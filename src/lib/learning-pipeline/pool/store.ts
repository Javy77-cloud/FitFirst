import type { TrainingRecord } from "../types";

/** Admin-only global pool. Accepts anonymized records only. */
export function createGlobalPoolStore() {
  const rows: TrainingRecord[] = [];

  return {
    layer: "global_pool" as const,
    adminOnly: true as const,

    write(record: TrainingRecord): TrainingRecord {
      rows.push(record);
      return record;
    },

    list(): TrainingRecord[] {
      return [...rows];
    },

    size(): number {
      return rows.length;
    },
  };
}

export type GlobalPoolStore = ReturnType<typeof createGlobalPoolStore>;
