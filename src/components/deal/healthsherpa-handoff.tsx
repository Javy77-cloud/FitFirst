"use client";

import { useState } from "react";
import { syncDealToHealthSherpaAction } from "@/app/actions/healthsherpa";
import { Button } from "@/components/ui/button";
import {
  HEALTHSHERPA_ACA_LOGIN_URL,
  HEALTHSHERPA_ACA_NEEDS_PARTNER,
  HEALTHSHERPA_ACA_READY,
  HEALTHSHERPA_KEYS_MISSING,
  HEALTHSHERPA_LOGIN_URL,
  HEALTHSHERPA_MANUAL_LINES_NOTE,
} from "@/lib/healthsherpa/copy";
import { healthSherpaProductForPlan } from "@/lib/healthsherpa/sheet";

export function HealthSherpaHandoff({
  dealId,
  planType,
  usingHealthSherpa,
  medicareReady,
  acaReady,
}: {
  dealId: string;
  planType: string | null;
  usingHealthSherpa: boolean;
  medicareReady: boolean;
  acaReady: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const product = healthSherpaProductForPlan(planType);

  if (!usingHealthSherpa) return null;

  async function onSync() {
    setBusy(true);
    setNote(null);
    try {
      const result = await syncDealToHealthSherpaAction(dealId);
      if (!result.ok) {
        setNote(result.message);
        return;
      }
      setNote(result.message);
      if (result.redirectUrl) window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "HealthSherpa sync failed.");
    } finally {
      setBusy(false);
    }
  }

  const disabled =
    product === "manual" ||
    (product === "medicare" && !medicareReady) ||
    (product === "marketplace" && !acaReady);

  return (
    <div className="flex flex-col items-end gap-1" data-ff-healthsherpa-handoff="">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            window.open(
              product === "marketplace" ? HEALTHSHERPA_ACA_LOGIN_URL : HEALTHSHERPA_LOGIN_URL,
              "_blank",
              "noopener,noreferrer",
            )
          }
          data-ff-healthsherpa-login=""
        >
          Open HealthSherpa
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled || busy}
          onClick={() => void onSync()}
          data-ff-healthsherpa-sync=""
        >
          {busy ? "Syncing…" : "Sync to HealthSherpa"}
        </Button>
      </div>
      <p className="max-w-sm text-right text-[11px] text-muted-foreground" data-ff-healthsherpa-handoff-note="">
        {note ??
          (product === "manual"
            ? HEALTHSHERPA_MANUAL_LINES_NOTE
            : product === "marketplace"
              ? acaReady
                ? HEALTHSHERPA_ACA_READY
                : HEALTHSHERPA_ACA_NEEDS_PARTNER
              : !medicareReady
                ? HEALTHSHERPA_KEYS_MISSING
                : "Syncs the contact, then opens the HealthSherpa quote page.")}
      </p>
    </div>
  );
}
