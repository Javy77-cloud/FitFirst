"use client";

import { useState } from "react";
import { openCarrierPortalUrl } from "@/app/actions/carriers-ops";
import { Button } from "@/components/ui/button";

export function CarrierPortalAgentButton({ carrierId }: { carrierId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function openPortal() {
    setBusy(true);
    setError(null);
    const result = await openCarrierPortalUrl(carrierId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-2" data-ff-carrier-portal-agent="">
      <Button type="button" size="sm" disabled={busy} onClick={() => void openPortal()}>
        Log in to carrier portal
      </Button>
      <p className="text-xs text-muted-foreground">
        Opens the portal URL in a new tab. Credentials stay with Admin — this never shows a password.
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
