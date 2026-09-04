import {
  getIntegrationProvider,
  type IntegrationProviderId,
} from "@/lib/integrations/catalog";

export const SOCIAL_PLATFORM_IDS = [
  "facebook",
  "instagram",
  "x",
  "linkedin",
  "google_business_profile",
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];

export const GBP_PLATFORM_ID = "google_business_profile" as const;

export function isSocialPlatformId(value: string): value is SocialPlatformId {
  return (SOCIAL_PLATFORM_IDS as readonly string[]).includes(value);
}

export function isGbpPlatform(id: string): boolean {
  return id === GBP_PLATFORM_ID;
}

export function socialLeadSource(id: SocialPlatformId): string {
  return id;
}

export function socialPlatformLabel(id: SocialPlatformId): string {
  return getIntegrationProvider(id).name;
}

/** Javy's GBP rule: agents see GBP pulse only after Admin enables monitoring. */
export function gbpVisibleToRole(
  role: "admin" | "agent",
  allowAgentsMonitorGbp: boolean,
): boolean {
  return role === "admin" || allowAgentsMonitorGbp;
}

export function gbpLockedForViewer(
  role: "admin" | "agent",
  allowAgentsMonitorGbp: boolean,
): boolean {
  return !gbpVisibleToRole(role, allowAgentsMonitorGbp);
}

export function canUseSocialPlatform(
  id: SocialPlatformId,
  role: "admin" | "agent",
  allowAgentsMonitorGbp: boolean,
): boolean {
  if (!isGbpPlatform(id)) return true;
  return gbpVisibleToRole(role, allowAgentsMonitorGbp);
}

export function asSocialProviderId(id: SocialPlatformId): IntegrationProviderId {
  return id;
}
