"use client";

import { markReconStatus, recordReconReceived } from "@/app/actions/commission-recon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReconRowActions({
  reconId,
  received,
  status,
}: {
  reconId: string;
  received: number;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
      <form action={recordReconReceived} className="flex items-center gap-1">
        <input type="hidden" name="reconId" value={reconId} />
        <Input
          name="received"
          inputMode="decimal"
          defaultValue={received.toFixed(2)}
          aria-label="Received amount"
          className="h-7 w-24 px-2 text-xs"
        />
        <Button type="submit" size="xs" variant="outline">
          Save
        </Button>
      </form>
      <div className="flex flex-wrap gap-1">
        {status !== "short" ? (
          <form action={markReconStatus}>
            <input type="hidden" name="reconId" value={reconId} />
            <input type="hidden" name="status" value="short" />
            <Button type="submit" size="xs" variant="outline">
              Mark short
            </Button>
          </form>
        ) : null}
        {status !== "disputed" ? (
          <form action={markReconStatus}>
            <input type="hidden" name="reconId" value={reconId} />
            <input type="hidden" name="status" value="disputed" />
            <Button type="submit" size="xs" variant="outline">
              Dispute
            </Button>
          </form>
        ) : null}
        {status !== "matched" && status !== "earned" ? (
          <form action={markReconStatus}>
            <input type="hidden" name="reconId" value={reconId} />
            <input type="hidden" name="status" value="matched" />
            <Button type="submit" size="xs" variant="ghost">
              Match
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
