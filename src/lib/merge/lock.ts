import { CONTACT_ID, LEAD_ID } from "@/lib/fixtures/ids";
import { normalizeName } from "./normalize";

export const ANA_LOCKED_IDS = new Set([CONTACT_ID, LEAD_ID]);

export class MergeLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MergeLockError";
  }
}

export function isAnaLockedId(id: string | null | undefined): boolean {
  return Boolean(id && ANA_LOCKED_IDS.has(id));
}

export function isAnaName(firstName: string, lastName: string): boolean {
  return normalizeName(firstName, lastName) === "ana dib";
}

export function assertMergeAllowed(
  keeper: { id: string; firstName: string; lastName: string },
  duplicate: { id: string; firstName: string; lastName: string },
): void {
  const locked =
    isAnaLockedId(keeper.id) ||
    isAnaLockedId(duplicate.id) ||
    isAnaName(keeper.firstName, keeper.lastName) ||
    isAnaName(duplicate.firstName, duplicate.lastName);
  if (locked) {
    throw new MergeLockError(
      "Ana Dib is locked. Do not merge or edit her shop, contact, or lead.",
    );
  }
  if (keeper.id === duplicate.id) {
    throw new MergeLockError("Keeper and duplicate must be different records.");
  }
}
