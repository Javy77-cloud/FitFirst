"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { flashAction } from "@/lib/flash-client";

type JobLite = {
  engine?: string;
  status?: string;
  filledKeys?: string[];
};

/**
 * After upload/delete, Fill runs in after(). RSC payload stays stale until refresh.
 * Poll router.refresh while watching; toast when a gemini/pdf done job shows filledKeys.
 */
export function BackgroundFillRefresh({
  dealId,
  jobs = [],
  enabled = false,
}: {
  dealId: string;
  jobs?: JobLite[];
  enabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flash = searchParams.get("flash");
  const watchFromFlash =
    flash === "document-uploaded" ||
    flash === "document-deleted" ||
    flash === "document-replaced" ||
    searchParams.get("notice") === "filled";
  const [watching, setWatching] = useState(enabled || watchFromFlash);
  const baselineDone = useRef(0);
  const toasted = useRef(false);

  const doneFillCount = useMemo(() => {
    return jobs.filter(
      (job) =>
        (job.status === "done" || job.status === "needs_glance") &&
        Array.isArray(job.filledKeys) &&
        job.filledKeys.length > 0,
    ).length;
  }, [jobs]);

  const latestFilled = useMemo(() => {
    for (let i = jobs.length - 1; i >= 0; i -= 1) {
      const job = jobs[i];
      if (
        (job.status === "done" || job.status === "needs_glance") &&
        Array.isArray(job.filledKeys) &&
        job.filledKeys.length > 0
      ) {
        return job.filledKeys.length;
      }
    }
    return 0;
  }, [jobs]);

  useEffect(() => {
    if (enabled || watchFromFlash) {
      baselineDone.current = doneFillCount;
      toasted.current = false;
      setWatching(true);
    }
  }, [enabled, watchFromFlash]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!watching) return;
    const started = Date.now();
    const maxMs = 120_000;
    const id = window.setInterval(() => {
      if (Date.now() - started > maxMs) {
        window.clearInterval(id);
        setWatching(false);
        return;
      }
      router.refresh();
    }, 4000);
    router.refresh();
    return () => window.clearInterval(id);
  }, [watching, router, dealId]);

  useEffect(() => {
    if (!watching || toasted.current) return;
    if (doneFillCount > baselineDone.current && latestFilled > 0) {
      toasted.current = true;
      flashAction("sheet-filled");
      setWatching(false);
      router.refresh();
    }
  }, [doneFillCount, latestFilled, watching, router]);

  if (!watching) return null;
  return (
    <p
      className="rounded-md bg-fit-yellow-bg px-3 py-2 text-sm text-fit-yellow"
      data-ff-fill-watching=""
    >
      Fill running in the background — sheet refreshes when CHECK cells land.
      {latestFilled > 0 ? ` Last fill wrote ${latestFilled} keys.` : null}
    </p>
  );
}
