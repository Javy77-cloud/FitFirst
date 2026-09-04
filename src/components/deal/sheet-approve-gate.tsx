"use client";

import { useState } from "react";
import { approveMasterSheet } from "@/app/actions/quoting";
import { Button } from "@/components/ui/button";

export function SheetApproveGate({
  dealId,
  line,
  formLabel,
  unlocked,
  approvedBy,
}: {
  dealId: string;
  line: string;
  formLabel: string;
  unlocked: boolean;
  approvedBy?: string | null;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (unlocked) {
    return (
      <div className="rounded-md bg-fit-green-bg px-3 py-2 text-xs text-fit-green">
        Master sheet approved{approvedBy ? ` by ${approvedBy}` : ""}. Quoting is unlocked. Quotes
        still do not bind.
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
    const sure = window.confirm(
      `Are you sure? This unlocks quoting for ${formLabel}. Quotes are not coverage and do not bind.`,
    );
    if (!sure) {
      setError("Second confirmation cancelled. Quoting stays locked.");
      return;
    }
    setPending(true);
    const data = new FormData(event.currentTarget);
    data.set("reviewed", "yes");
    data.set("sure", "yes");
    try {
      await approveMasterSheet(data);
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Could not unlock quoting.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-fit-yellow/40 bg-fit-yellow-bg/40 p-3">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="line" value={line} />
      <p className="text-sm font-semibold text-navy">Visual approval required</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Glance the {formLabel} master sheet. Yellow is missing. Blue is CHECK. Confirm, then
        answer “are you sure?” Quoting stays locked until both steps.
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
          {pending ? "Unlocking…" : "Approve and unlock quoting"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-fit-flag">{error}</p> : null}
    </form>
  );
}
