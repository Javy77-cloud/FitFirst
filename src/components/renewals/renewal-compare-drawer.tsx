"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye } from "lucide-react";
import {
  loadRenewalCompareDrawer,
  type RenewalCompareDrawerPayload,
} from "@/app/actions/renewals-wedge";
import { Button } from "@/components/ui/button";
import { ClientStayingButton } from "@/components/renewals/client-staying-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HealthFactorList } from "@/components/health/health-factor-list";
import type { HealthChipView } from "@/lib/health/model";
import { cn } from "@/lib/utils";

export function RenewalCompareDrawer({
  policyId,
  renewalDate = null,
  clientName,
  canCompare,
  open,
  onOpenChange,
  hideTrigger = false,
  clientHealth = null,
  policyHealth = null,
}: {
  policyId: string;
  renewalDate?: Date | string | null;
  clientName: string;
  canCompare: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  clientHealth?: HealthChipView | null;
  policyHealth?: HealthChipView | null;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [payload, setPayload] = useState<RenewalCompareDrawerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    start(async () => {
      const next = await loadRenewalCompareDrawer(policyId);
      if ("ok" in next && next.ok === false) {
        setError(next.error);
        setPayload(null);
        return;
      }
      setError(null);
      setPayload(next as RenewalCompareDrawerPayload);
    });
  }, [isOpen, policyId]);

  return (
    <>
      {hideTrigger ? null : (
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="ff-renewal-eye"
        data-ff-compare-eye=""
        title="Compare current vs proposed"
        onClick={() => setOpen(true)}
      >
        <Eye className="size-3.5" aria-hidden />
        <span className="sr-only">Compare terms for {clientName}</span>
      </Button>
      )}
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "ff-renewal-compare-drawer w-full sm:max-w-xl",
            (payload?.dark ?? !canCompare) && "ff-renewal-compare-dark",
          )}
          data-ff-renewal-compare=""
          data-ff-compare-dark={payload?.dark ?? !canCompare ? "true" : "false"}
        >
          <SheetHeader>
            <SheetTitle>Compare terms</SheetTitle>
            <div className="pt-2"><ClientStayingButton policyId={policyId} renewalDate={payload?.renewalDate ?? renewalDate} size="sm" /></div>
            <SheetDescription>
              {canCompare
                ? `${clientName} — current vs proposed. Matched lines stay green.`
                : `${clientName} — snapshot only until a renewal quote lands.`}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-6">
            {pending && !payload ? <p className="text-sm text-muted-foreground">Loading compare…</p> : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {!payload && (clientHealth || policyHealth) ? (
              <div className="ff-renewal-health-graphs" data-ff-health-graphs="">
                {clientHealth ? <HealthFactorList health={clientHealth} /> : null}
                {policyHealth ? <HealthFactorList health={policyHealth} /> : null}
              </div>
            ) : null}
            {payload ? (
              <>
                <div className="ff-renewal-compare-premium" data-ff-compare-premium={payload.premiumTone}>
                  <span>Premium</span>
                  <strong>{payload.premiumDelta ?? "—"}</strong>
                  <em>
                    {payload.currentPremium} → {payload.proposedPremium}
                  </em>
                </div>
                <table className="ff-renewal-compare-table">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Current</th>
                      <th>Proposed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.rows.map((row) => (
                      <tr key={row.key} data-ff-compare-tone={row.tone}>
                        <td>{row.label}</td>
                        <td>{row.currentValue}</td>
                        <td>{row.proposedValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <aside className="ff-renewal-compare-note" data-ff-gemini-source={payload.note.source}>
                  <p>{payload.note.text}</p>
                  {payload.note.lossRisk ? <p data-ff-loss-risk="">{payload.note.lossRisk}</p> : null}
                  {payload.note.source === "fallback" && payload.bothSides ? (
                    <p className="ff-renewal-compare-fallback">Gemini key not live — this is the desk fallback.</p>
                  ) : null}
                </aside>
                {payload.clientHealth || payload.policyHealth || clientHealth || policyHealth ? (
                  <div className="ff-renewal-health-graphs" data-ff-health-graphs="">
                    {(payload.clientHealth ?? clientHealth) ? (
                      <HealthFactorList health={(payload.clientHealth ?? clientHealth)!} />
                    ) : null}
                    {(payload.policyHealth ?? policyHealth) ? (
                      <HealthFactorList health={(payload.policyHealth ?? policyHealth)!} />
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
