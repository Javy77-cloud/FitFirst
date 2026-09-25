"use client";

import { useState } from "react";
import { openCarrierPortalUrl } from "@/app/actions/carriers-ops";
import { Button } from "@/components/ui/button";

export function CarrierPortalAgentButton({ carrierId }: { carrierId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function openPortal() {
    setError(null);
    // Sync open under the click (avoids popup blockers). FitFirst stays on this tab.
    const tab = window.open("about:blank", "_blank");
    if (tab) {
      try {
        tab.opener = null;
      } catch {
        /* ignore */
      }
    }
    setBusy(true);
    const result = await openCarrierPortalUrl(carrierId);
    setBusy(false);
    if (!result.ok) {
      tab?.close();
      setError(result.error);
      return;
    }
    if (tab) {
      tab.location.href = result.url;
    } else {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-2" data-ff-carrier-portal-agent="">
      <Button type="button" size="sm" disabled={busy} onClick={() => void openPortal()}>
        Log in to carrier portal
      </Button>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
