"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DeskPageError({
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
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-navy">
      <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">This desk page could not load</h1>
        <p className="text-sm text-muted-foreground">
          Optional chrome failed. Your book is still saved. Reload this page or go Home.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-navy px-3 py-1.5 text-sm text-white"
            onClick={() => reset()}
          >
            Try again
          </button>
          <Link className="rounded-md border px-3 py-1.5 text-sm" href="/">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
