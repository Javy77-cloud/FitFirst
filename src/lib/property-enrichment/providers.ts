/**
 * Paid property-data providers — working stubs + BYO key walls.
 *
 * Primary: ATTOM or Estated (normalized multi-state).
 * Florida supplement: Florida Property API (MapWise-compatible stub) to
 * cross-check ATTOM. Agency pastes keys later.
 *
 * Never scrape Zillow or county HTML. Never return a Zestimate as Coverage A.
 */

export const PROPERTY_ENRICHMENT_ENV = {
  attom: "ATTOM_API_KEY",
  estated: "ESTATED_API_KEY",
  florida_property: "FLORIDA_PROPERTY_API_KEY",
} as const;

export type PropertyProviderId = keyof typeof PROPERTY_ENRICHMENT_ENV;

export type ProviderWall = {
  provider: PropertyProviderId;
  envVar: string;
  status: "ready" | "needs_key";
  message: string;
};

export function readProviderKey(provider: PropertyProviderId): string {
  return (process.env[PROPERTY_ENRICHMENT_ENV[provider]] ?? "").trim();
}

export function providerWall(provider: PropertyProviderId): ProviderWall {
  const envVar = PROPERTY_ENRICHMENT_ENV[provider];
  const hasKey = Boolean(readProviderKey(provider));
  const names: Record<PropertyProviderId, string> = {
    attom: "ATTOM",
    estated: "Estated",
    florida_property: "Florida Property API",
  };
  if (!hasKey) {
    return {
      provider,
      envVar,
      status: "needs_key",
      message: `${names[provider]} is stubbed. Set ${envVar} (agency BYO) to go live. No Zillow. No county scrape.`,
    };
  }
  return {
    provider,
    envVar,
    status: "ready",
    message: `${names[provider]} key present — live vendor call is still agency-owned. Stub payload until the vendor seat is wired.`,
  };
}

export function allProviderWalls(): ProviderWall[] {
  return (Object.keys(PROPERTY_ENRICHMENT_ENV) as PropertyProviderId[]).map(providerWall);
}

export function pickPrimaryProvider(): PropertyProviderId {
  if (readProviderKey("attom")) return "attom";
  if (readProviderKey("estated")) return "estated";
  return "attom";
}
