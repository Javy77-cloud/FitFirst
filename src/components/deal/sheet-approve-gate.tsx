"use client";

import { useState } from "react";
import { requestAppetiteQuotesAction } from "@/app/actions/quotes";
import { approveMasterSheet } from "@/app/actions/quoting";
import { Button } from "@/components/ui/button";

export function SheetApproveGate({
  dealId,
  line,
  formLabel,
  unlocked,
  approvedBy,
  persistSheet,
}: {
  dealId: string;
  line: string;
  formLabel: string;
  unlocked: boolean;
  approvedBy?: string | null;
  persistSheet?: () => Promise<void>;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (unlocked) {
    return (
      <div className="space-y-2 rounded-md border border-fit-green/30 bg-fit-green-bg px-3 py-3" data-ff-sheet-approve>
        <p className="text-xs text-fit-green">
          Master sheet approved{approvedBy ? ` by ${approvedBy}` : ""}. Request quotes from every
          in-appetite carrier.
        </p>
        <form
          action={requestAppetiteQuotesAction}
          onSubmit={async (event) => {
            event.preventDefault();
            if (persistSheet) await persistSheet();
            const data = new FormData(event.currentTarget);
            await requestAppetiteQuotesAction(data);
          }}
        >
          <input type="hidden" name="dealId" value={dealId} />
          <Button type="submit" size="sm">
            Confirm & request quotes
          </Button>
        </form>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!reviewed) {
      setError("Check that you visually reviewed this sheet first.");
      return;
    }
    setPending(true);
    try {
      if (persistSheet) await persistSheet();
      const sheetForm = document.getElementById("ff-master-sheet-save") as HTMLFormElement | null;
      const data = new FormData(event.currentTarget);
      if (sheetForm) {
        for (const [key, value] of new FormData(sheetForm).entries()) {
          if (!data.has(key)) data.set(key, String(value));
        }
      }
      data.set("reviewed", "yes");
      data.set("sure", "yes");
      data.set("requestQuotes", "yes");
      await approveMasterSheet(data);
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Could not confirm the sheet or request quotes.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border border-fit-yellow/40 bg-fit-yellow-bg/40 p-3"
      data-ff-sheet-approve
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="line" value={line} />
      <p className="text-sm font-semibold text-navy">Confirm this sheet</p>
      <p className="mt-1 text-helper text-muted-foreground">
        Glance the {formLabel} master sheet. One click confirms it and requests quotes from every
        in-appetite carrier.
      </p>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(event) => setReviewed(event.target.checked)}
          className="mt-0.5"
        />
        <span>I visually reviewed this master sheet.</span>
      </label>
      <div className="mt-3">
        <Button type="submit" size="sm" disabled={!reviewed || pending}>
          {pending ? "Requesting quotes…" : "Confirm & request quotes"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-fit-flag">{error}</p> : null}
    </form>
  );
}
