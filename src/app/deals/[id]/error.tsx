"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DealPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen bg-background px-6 py-10 text-navy"
      data-ff-deal-load-error=""
    >
      <div className="mx-auto max-w-lg space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-navy">Could not open this deal</h1>
        <p className="text-sm text-muted-foreground">
          The shop is still saved. Open Deals and try this record again — this is not a blank
          screen, and nothing you just typed was thrown away.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-navy px-3 py-1.5 text-sm text-white"
            onClick={() => reset()}
          >
            Try again
          </button>
          <Link className="rounded-md border px-3 py-1.5 text-sm" href="/deals">
            Back to Deals
          </Link>
        </div>
      </div>
    </div>
  );
}
