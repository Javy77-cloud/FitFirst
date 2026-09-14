"use client";

import {
  portalCredentialLabel,
  type PortalCredStatus,
} from "@/lib/carriers/portal-status";

/** List Portal status: missing labels stay text; Connected opens portal in a new tab. */
export function CarrierPortalStatusCell({
  carrierId,
  status,
  href,
}: {
  carrierId: string;
  status: PortalCredStatus | string;
  /** Resolved portal URL (portal → agent portal → website). Required for Connected. */
  href?: string | null;
}) {
  const portalStatus: PortalCredStatus =
    status === "connected" || status === "no_portal" || status === "missing_credentials"
      ? status
      : "missing_credentials";

  if (portalStatus !== "connected") {
    return (
      <span
        className={
          portalStatus === "no_portal"
            ? "text-xs text-muted-foreground"
            : "text-xs font-medium text-amber-800"
        }
        title={
          portalStatus === "no_portal"
            ? "No portal URL and no username/password on file yet"
            : "Portal started but URL, username, or password is still incomplete"
        }
        data-ff-carrier-portal-status={portalStatus}
      >
        {portalCredentialLabel(portalStatus)}
      </span>
    );
  }

  const url = (href ?? "").trim();
  if (!url) {
    return (
      <span className="text-xs font-medium text-amber-800" data-ff-carrier-portal-status="connected">
        Missing credentials
      </span>
    );
  }

  // Native <a target="_blank"> keeps FitFirst open and is not treated as a blocked popup.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Opens carrier portal in a new tab — FitFirst stays open"
      data-ff-carrier-id={carrierId}
      data-ff-carrier-portal-status="connected"
      data-ff-carrier-portal-open=""
      className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-xs font-semibold no-underline hover:opacity-95"
      style={{ backgroundColor: "#166534", color: "#ffffff", border: "1px solid #166534" }}
    >
      Connected
    </a>
  );
}
