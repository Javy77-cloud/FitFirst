import { filterCommissionRows, type CommissionBookFilter } from "./filters";
import { toNumber } from "./math";

export const RECON_STATUSES = ["pending", "matched", "short", "disputed", "earned"] as const;
export type ReconStatus = (typeof RECON_STATUSES)[number];

export const AGENT_RECON_BUCKETS = ["earned", "pending", "disputed"] as const;
export type AgentReconBucket = (typeof AGENT_RECON_BUCKETS)[number];

export const RECON_STATUS_LABEL: Record<ReconStatus, string> = {
  pending: "Pending",
  matched: "Matched",
  short: "Short",
  disputed: "Disputed",
  earned: "Earned",
};

export const AGENT_BUCKET_LABEL: Record<AgentReconBucket, string> = {
  earned: "Earned",
  pending: "Pending",
  disputed: "Disputed",
};

export function isReconStatus(value: string | undefined | null): value is ReconStatus {
  return Boolean(value && (RECON_STATUSES as readonly string[]).includes(value));
}

export function money2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function reconVariance(expected: number, received: number): number {
  return money2(toNumber(expected) - toNumber(received));
}

/**
 * Rule/manual status. Explicit disputed/short/earned wins.
 * Otherwise: $0 received → pending; received ≥ expected → matched (earned if paid); else short.
 */
export function deriveReconStatus(input: {
  expected: number;
  received: number;
  explicit?: string | null;
  paid?: boolean;
}): ReconStatus {
  const expected = toNumber(input.expected);
  const received = toNumber(input.received);
  const explicit = isReconStatus(input.explicit) ? input.explicit : null;

  if (explicit === "disputed") return "disputed";
  if (explicit === "earned") return "earned";
  if (explicit === "short") return "short";
  if (explicit === "matched") return input.paid ? "earned" : "matched";
  if (explicit === "pending") return "pending";

  if (received <= 0) return "pending";
  const shortBy = reconVariance(expected, received);
  if (shortBy <= 0) return input.paid ? "earned" : "matched";
  return "short";
}

/** Agent desk only shows earned / pending / disputed. Short stays pending (still owed). */
export function agentReconBucket(status: string): AgentReconBucket {
  if (status === "disputed") return "disputed";
  if (status === "earned" || status === "matched") return "earned";
  return "pending";
}

export function isAgentVisibleBucket(status: string): boolean {
  return (AGENT_RECON_BUCKETS as readonly string[]).includes(agentReconBucket(status));
}

export type ReconWorkspaceRow = {
  reconId: string;
  commissionId: string;
  agentId: string | null;
  agentName: string;
  policyNumber: string | null;
  lineOfBusiness: string | null;
  expected: number;
  received: number;
  variance: number;
  status: ReconStatus;
  note: string | null;
  paid: boolean;
  dueDate?: Date | string | null;
  paidDate?: Date | string | null;
  createdAt?: Date | string | null;
};

export function filterAgentOwnRows(
  rows: ReconWorkspaceRow[],
  viewerId: string | null | undefined,
): ReconWorkspaceRow[] {
  if (!viewerId) return [];
  return rows.filter((row) => row.agentId === viewerId);
}

export function filterReconStatus(
  rows: ReconWorkspaceRow[],
  status?: string | null,
): ReconWorkspaceRow[] {
  if (!status || status === "all") return rows;
  if (status === "shortfall") return rows.filter((row) => row.status === "short" || row.variance > 0);
  return rows.filter((row) => row.status === status);
}

/** Book / date window uses payout paid|pending. Do not overwrite recon status. */
export function filterReconBookRows<T extends ReconWorkspaceRow>(
  rows: T[],
  filter: CommissionBookFilter,
): T[] {
  return filterCommissionRows(
    rows.map((row) => ({
      row,
      lineOfBusiness: row.lineOfBusiness,
      policyLineOfBusiness: row.lineOfBusiness,
      status: row.paid ? "paid" : "pending",
      dueDate: row.dueDate,
      paidDate: row.paidDate,
      createdAt: row.createdAt,
    })),
    filter,
  ).map((wrapped) => wrapped.row);
}

export function reconBoardTotals(rows: ReconWorkspaceRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.expected = money2(acc.expected + row.expected);
      acc.received = money2(acc.received + row.received);
      if (row.variance > 0) acc.shortfall = money2(acc.shortfall + row.variance);
      if (row.status === "short") acc.shortCount += 1;
      if (row.status === "disputed") {
        acc.disputed = money2(acc.disputed + row.expected);
        acc.disputedCount += 1;
      }
      if (row.status === "pending") acc.pending = money2(acc.pending + row.expected);
      if (row.status === "earned" || row.status === "matched") {
        acc.earned = money2(acc.earned + row.received);
      }
      return acc;
    },
    {
      expected: 0,
      received: 0,
      shortfall: 0,
      disputed: 0,
      pending: 0,
      earned: 0,
      shortCount: 0,
      disputedCount: 0,
    },
  );
}

export function producerTotals(rows: ReconWorkspaceRow[]) {
  return rows.reduce(
    (acc, row) => {
      const bucket = agentReconBucket(row.status);
      if (bucket === "earned") acc.earned = money2(acc.earned + (row.received || row.expected));
      if (bucket === "pending") acc.pending = money2(acc.pending + row.expected - row.received);
      if (bucket === "disputed") acc.disputed = money2(acc.disputed + row.expected);
      acc[`${bucket}Count` as const] += 1;
      return acc;
    },
    { earned: 0, pending: 0, disputed: 0, earnedCount: 0, pendingCount: 0, disputedCount: 0 },
  );
}

export function parseReceivedAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(/[$,]/g, "");
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return money2(n);
}
