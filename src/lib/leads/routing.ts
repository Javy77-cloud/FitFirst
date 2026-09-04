import { isSocialPlatformId, type SocialPlatformId } from "@/lib/social/platforms";

export type InboundAssignment = "agent" | "unassigned";

/** Agency-level inbound stays unassigned until Admin awards it. */
export function inboundAssignment(connectionOwnerUserId: string | null | undefined): {
  assignment: InboundAssignment;
  ownerUserId: string | null;
} {
  const owner = connectionOwnerUserId?.trim() || null;
  if (owner) return { assignment: "agent", ownerUserId: owner };
  return { assignment: "unassigned", ownerUserId: null };
}

export function isInboundSocialSource(source: string | null | undefined): boolean {
  const value = (source ?? "").trim();
  if (!value) return false;
  if (value === "social" || value === "social_stub") return true;
  return isSocialPlatformId(value);
}

export function connectionOwnerFor(
  platform: SocialPlatformId,
  connections: { id: string; ownerUserId?: string | null }[],
): string | null {
  const row = connections.find((item) => item.id === platform);
  return row?.ownerUserId ?? null;
}
