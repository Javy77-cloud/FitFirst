export const ACCESS_STATUSES = ["active", "frozen", "removed"] as const;

export type AccessStatus = (typeof ACCESS_STATUSES)[number];

export const ACCESS_STATUS_LABEL: Record<AccessStatus, string> = {
  active: "Active",
  frozen: "Frozen",
  removed: "Removed",
};

export function normalizeAccessStatus(raw: string | null | undefined): AccessStatus {
  const value = (raw ?? "active").trim().toLowerCase();
  if (value === "frozen") return "frozen";
  if (value === "removed") return "removed";
  return "active";
}

export function isDeskLoginAllowed(status: string | null | undefined): boolean {
  return normalizeAccessStatus(status) === "active";
}

export function accessStatusFromFlags(input: {
  accessStatus?: string | null;
  active?: boolean | null;
  removedAt?: Date | null;
  frozenAt?: Date | null;
}): AccessStatus {
  if (input.removedAt) return "removed";
  if (input.frozenAt) return "frozen";
  if (input.accessStatus) return normalizeAccessStatus(input.accessStatus);
  if (input.active === false) return "frozen";
  return "active";
}

export function flagsForStatus(status: AccessStatus, at = new Date()) {
  if (status === "removed") {
    return {
      accessStatus: "removed" as const,
      active: false,
      removedAt: at,
      frozenAt: null as Date | null,
    };
  }
  if (status === "frozen") {
    return {
      accessStatus: "frozen" as const,
      active: false,
      frozenAt: at,
      removedAt: null as Date | null,
    };
  }
  return {
    accessStatus: "active" as const,
    active: true,
    frozenAt: null as Date | null,
    removedAt: null as Date | null,
  };
}
