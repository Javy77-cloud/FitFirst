const EASTERN = "America/New_York";

export type AgentConfirmAudit = {
  userId: string | null;
  name: string;
  confirmedAt: string;
  confirmedAtEt: string;
};

/** Agent-facing stamp. September is EDT; the zone name comes from the clock. */
export function formatEasternConfirmStamp(at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(at);
}

export function buildAgentConfirmAudit(input: {
  userId?: string | null;
  name?: string | null;
  at?: Date;
}): AgentConfirmAudit {
  const at = input.at ?? new Date();
  const name = (input.name ?? "").trim() || "Agent";
  const userId = (input.userId ?? "").trim();
  return {
    userId: userId || null,
    name,
    confirmedAt: at.toISOString(),
    confirmedAtEt: formatEasternConfirmStamp(at),
  };
}

export function parseAgentConfirm(raw: unknown): AgentConfirmAudit | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Partial<AgentConfirmAudit>;
  const confirmedAt = typeof row.confirmedAt === "string" ? row.confirmedAt.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!confirmedAt || !name) return null;
  const confirmedAtEt = typeof row.confirmedAtEt === "string" ? row.confirmedAtEt.trim() : "";
  return {
    userId: typeof row.userId === "string" && row.userId.trim() ? row.userId.trim() : null,
    name,
    confirmedAt,
    confirmedAtEt: confirmedAtEt || formatEasternConfirmStamp(new Date(confirmedAt)),
  };
}
