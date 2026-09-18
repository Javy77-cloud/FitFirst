"use client";

import { useState } from "react";
import {
  bulkSyncMedicareContactsAction,
  hideMedicareBulkSyncAction,
  restoreMedicareBulkSyncAction,
} from "@/app/actions/healthsherpa";
import { Button } from "@/components/ui/button";
import {
  HEALTHSHERPA_MEDICARE_BULK_FILTER,
  HEALTHSHERPA_MEDICARE_BULK_ONESHOT,
  HEALTHSHERPA_MEDICARE_BULK_TITLE,
} from "@/lib/healthsherpa/copy";
import type { MedicareBulkOneshotState, MedicareBulkRunResult } from "@/lib/healthsherpa/bulk-medicare";

export function MedicareBulkSyncPanel({
  ready,
  oneshot,
  compact = false,
}: {
  ready: {
    hasApiKey: boolean;
    hasAgentEmail: boolean;
    configured: boolean;
    code: "ok" | "not_configured" | "agent_email";
    message: string | null;
  };
  oneshot: MedicareBulkOneshotState;
  compact?: boolean;
}) {
  const [hidden, setHidden] = useState(oneshot.hidden);
  const [lastRun, setLastRun] = useState<MedicareBulkOneshotState["lastRun"]>(oneshot.lastRun);
  const [result, setResult] = useState<MedicareBulkRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function onSync() {
    setBusy(true);
    setNote(null);
    try {
      const next = await bulkSyncMedicareContactsAction();
      setResult(next);
      setLastRun({
        synced: next.synced,
        skipped: next.skipped,
        failed: next.failed,
        code: next.code,
        message: next.message,
        candidateCount: next.candidateCount,
      });
      if (next.configured && next.ok && next.code !== "empty") {
        setHidden(true);
      }
      setNote(next.message);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Medicare bulk sync failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onHide() {
    setBusy(true);
    try {
      const state = await hideMedicareBulkSyncAction();
      setHidden(true);
      setLastRun(state.lastRun);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not hide this control.");
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    setBusy(true);
    try {
      const state = await restoreMedicareBulkSyncAction();
      setHidden(false);
      setLastRun(state.lastRun);
      setNote(null);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not restore this control.");
    } finally {
      setBusy(false);
    }
  }

  const live = result ?? (lastRun
    ? {
        ...lastRun,
        ok: lastRun.failed === 0,
        configured: true,
        rows: [],
        errors: [],
      }
    : null);

  if (hidden) {
    return (
      <section
        className="rounded-md border border-dashed border-border bg-secondary/40 p-3"
        data-ff-healthsherpa-medicare-bulk="hidden"
      >
        <p className="text-xs text-muted-foreground">
          One-shot Medicare contact sync is hidden
          {lastRun
            ? ` · last run ${lastRun.synced} synced / ${lastRun.skipped} skipped / ${lastRun.failed} failed`
            : ""}
          .
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2"
          disabled={busy}
          onClick={() => void onRestore()}
          data-ff-healthsherpa-medicare-bulk-restore=""
        >
          Show one-shot control
        </Button>
      </section>
    );
  }

  return (
    <section
      className={`space-y-3 rounded-md border border-dashed border-amber-700/40 bg-amber-50/60 p-3 ${compact ? "" : "p-4"}`}
      data-ff-healthsherpa-medicare-bulk="visible"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
            One-time / temporary
          </p>
          <h3 className="text-sm font-semibold text-navy">{HEALTHSHERPA_MEDICARE_BULK_TITLE}</h3>
        </div>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={busy}
          onClick={() => void onHide()}
          data-ff-healthsherpa-medicare-bulk-hide=""
        >
          Hide
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{HEALTHSHERPA_MEDICARE_BULK_ONESHOT}</p>
      <p className="text-xs text-muted-foreground" data-ff-healthsherpa-medicare-bulk-filter="">
        {HEALTHSHERPA_MEDICARE_BULK_FILTER}
      </p>
      {!ready.configured ? (
        <p className="text-xs text-navy" data-ff-healthsherpa-medicare-bulk-not-configured="">
          {ready.message ?? "HealthSherpa Medicare is not configured."}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!ready.configured || busy}
          onClick={() => void onSync()}
          data-ff-healthsherpa-medicare-bulk-run=""
        >
          {busy ? "Syncing Medicare contacts…" : HEALTHSHERPA_MEDICARE_BULK_TITLE}
        </Button>
      </div>
      {note ? (
        <p className="text-xs text-navy" data-ff-healthsherpa-medicare-bulk-note="">
          {note}
        </p>
      ) : null}
      {live ? (
        <div className="text-xs text-navy" data-ff-healthsherpa-medicare-bulk-tally="">
          <p>
            {live.synced} synced · {live.skipped} skipped · {live.failed} failed
            {live.candidateCount != null ? ` · ${live.candidateCount} matched` : ""}
          </p>
          {result?.errors.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4" data-ff-healthsherpa-medicare-bulk-errors="">
              {result.errors.map((error) => (
                <li key={`${error.contactId}-${error.message}`}>
                  {error.name}: {error.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
