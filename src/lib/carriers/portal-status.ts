/** Portal credential readiness for list/detail (no secrets). */

export type PortalCredStatus = "connected" | "missing_credentials" | "no_portal";

export function portalCredentialStatus(input: {
  portalUrl?: string | null;
  hasPortalUsername?: boolean;
  hasPortalPassword?: boolean;
}): PortalCredStatus {
  const url = Boolean(input.portalUrl?.trim());
  const user = Boolean(input.hasPortalUsername);
  const pass = Boolean(input.hasPortalPassword);
  if (url && user && pass) return "connected";
  // Soft empty: nothing started yet → "No portal linked" (not Missing credentials).
  if (!url && !user && !pass) return "no_portal";
  return "missing_credentials";
}

export function portalCredentialLabel(status: PortalCredStatus): string {
  if (status === "connected") return "Connected";
  if (status === "no_portal") return "No portal linked";
  return "Missing credentials";
}
