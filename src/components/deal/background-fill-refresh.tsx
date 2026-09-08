"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { flashAction } from "@/lib/flash-client";
import { toastForFillCounts } from "@/lib/quote-sheet/fill-toast";

type JobLite = {
  engine?: string;
  status?: string;
  filledKeys?: string[];
  skippedKeys?: string[];
  message?: string | null;
};

function isDoneFillJob(job: JobLite): boolean {
  return job.status === "done" || job.status === "needs_glance";
}

function jobDidWork(job: JobLite): boolean {
  const filled = Array.isArray(job.filledKeys) ? job.filledKeys.length : 0;
  const skipped = Array.isArray(job.skippedKeys) ? job.skippedKeys.length : 0;
  return filled > 0 || skipped > 0 || Boolean(job.message?.trim());
}

/**
 * After upload/delete, Fill runs in after(). RSC payload stays stale until refresh.
 * Poll router.refresh while watching; toast when a done job shows filled/skipped work.
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
    return jobs.filter((job) => isDoneFillJob(job) && jobDidWork(job)).length;
  }, [jobs]);

  const latestJob = useMemo(() => {
    for (let i = jobs.length - 1; i >= 0; i -= 1) {
      const job = jobs[i];
      if (isDoneFillJob(job) && jobDidWork(job)) return job;
    }
    return null;
  }, [jobs]);

  const latestFilled = latestJob
    ? Array.isArray(latestJob.filledKeys)
      ? latestJob.filledKeys.length
      : 0
    : 0;
  const latestSkipped = latestJob
    ? Array.isArray(latestJob.skippedKeys)
      ? latestJob.skippedKeys.length
      : 0
    : 0;

  useEffect(() => {
    if (enabled || watchFromFlash) {
      baselineDone.current = doneFillCount;
      toasted.current = false;
      setWatching(true);
    }
    // intentionally omit doneFillCount — baseline only when watch starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, watchFromFlash]);

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
    if (doneFillCount > baselineDone.current && latestJob) {
      toasted.current = true;
      flashAction(
        toastForFillCounts({ filledCount: latestFilled, skippedCount: latestSkipped }),
      );
      setWatching(false);
      router.refresh();
    }
  }, [doneFillCount, latestJob, latestFilled, latestSkipped, watching, router]);

  if (!watching) return null;
  return (
    <p
      className="rounded-md bg-fit-yellow-bg px-3 py-2 text-sm text-fit-yellow"
      data-ff-fill-watching=""
    >
      Fill running in the background — sheet refreshes when CHECK cells land.
      {latestFilled > 0 || latestSkipped > 0
        ? ` Last fill: ${toastForFillCounts({ filledCount: latestFilled, skippedCount: latestSkipped })}.`
        : null}
    </p>
  );
}
