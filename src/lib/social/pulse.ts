import type { CatalogItem } from "@/lib/integrations/catalog-store";
import {
  GBP_PLATFORM_ID,
  SOCIAL_PLATFORM_IDS,
  canUseSocialPlatform,
  gbpLockedForViewer,
  isSocialPlatformId,
  socialPlatformLabel,
  type SocialPlatformId,
} from "./platforms";
import {
  SOCIAL_INQUIRY_SEEDS,
  SOCIAL_PULSE_SEEDS,
  type SocialInquirySeed,
  type SocialPulseMetrics,
} from "./seeds";

export type SocialPulseCard = {
  id: SocialPlatformId;
  name: string;
  initials: string;
  connected: boolean;
  locked: boolean;
  lockReason: string | null;
  accountLabel: string | null;
  metrics: SocialPulseMetrics | null;
};

export type SocialPulseInquiry = SocialInquirySeed & {
  platformLabel: string;
};

export type SocialPulseSnapshot = {
  cards: SocialPulseCard[];
  inquiries: SocialPulseInquiry[];
  connectedVisible: number;
  gbpLocked: boolean;
  allowAgentsMonitorGbp: boolean;
};

export function buildSocialPulse(input: {
  items: Pick<CatalogItem, "id" | "name" | "initials" | "connected" | "accountLabel">[];
  role: "admin" | "agent";
  allowAgentsMonitorGbp: boolean;
}): SocialPulseSnapshot {
  const byId = new Map(input.items.map((item) => [item.id, item]));
  const gbpLocked = gbpLockedForViewer(input.role, input.allowAgentsMonitorGbp);

  const cards: SocialPulseCard[] = SOCIAL_PLATFORM_IDS.map((id) => {
    const item = byId.get(id);
    const connected = Boolean(item?.connected);
    const locked = id === GBP_PLATFORM_ID && gbpLocked;
    const usable = canUseSocialPlatform(id, input.role, input.allowAgentsMonitorGbp);
    return {
      id,
      name: item?.name ?? socialPlatformLabel(id),
      initials: item?.initials ?? id.slice(0, 2).toUpperCase(),
      connected,
      locked,
      lockReason: locked
        ? connected
          ? "Admin has not allowed agents to monitor Google Business Profile."
          : "Google Business Profile stays locked until Admin connects it and allows agent monitoring."
        : null,
      accountLabel: connected && usable ? (item?.accountLabel ?? null) : null,
      metrics: connected && usable ? SOCIAL_PULSE_SEEDS[id] : null,
    };
  });

  const visibleConnected = new Set(
    cards.filter((card) => card.connected && !card.locked && card.metrics).map((card) => card.id),
  );

  const inquiries = SOCIAL_INQUIRY_SEEDS.filter((row) => visibleConnected.has(row.platform)).map(
    (row) => ({
      ...row,
      platformLabel: socialPlatformLabel(row.platform),
    }),
  );

  return {
    cards,
    inquiries,
    connectedVisible: visibleConnected.size,
    gbpLocked,
    allowAgentsMonitorGbp: input.allowAgentsMonitorGbp,
  };
}

export function connectedSocialIds(
  items: { id: string; connected: boolean }[],
): SocialPlatformId[] {
  return items
    .filter((item) => item.connected && isSocialPlatformId(item.id))
    .map((item) => item.id);
}
