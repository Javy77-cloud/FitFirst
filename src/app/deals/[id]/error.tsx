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
    <div className="mx-auto max-w-lg space-y-3 p-6" data-ff-deal-load-error="">
      <h1 className="text-lg font-semibold text-navy">Could not open this deal</h1>
      <p className="text-sm text-muted-foreground">
        The shop is still saved. Try again, or go back to Deals.
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
  );
}
