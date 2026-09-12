/** Portal credential readiness for list/detail (no secrets). */

export type PortalCredStatus = "connected" | "missing_credentials";

export function portalCredentialStatus(input: {
  portalUrl?: string | null;
  hasPortalUsername?: boolean;
  hasPortalPassword?: boolean;
}): PortalCredStatus {
  const url = Boolean(input.portalUrl?.trim());
  const user = Boolean(input.hasPortalUsername);
  const pass = Boolean(input.hasPortalPassword);
  return url && user && pass ? "connected" : "missing_credentials";
}

export function portalCredentialLabel(status: PortalCredStatus): string {
  return status === "connected" ? "Connected" : "Missing credentials";
}
