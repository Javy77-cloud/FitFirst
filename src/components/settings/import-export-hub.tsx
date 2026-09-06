"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import { ENTITY_PACKS, canImport, type EntityPack } from "@/lib/import-export/catalog";
import type { CommitResult, PreviewResult } from "@/lib/import-export/types";
import { cn } from "@/lib/utils";

type JobRow = {
  id: string;
  actor_name: string;
  actor_email: string | null;
  entity: string;
  action: string;
  status: string;
  filename: string | null;
  rows_ok: number;
  rows_error: number;
  rows_create: number;
  rows_update: number;
  rows_skip: number;
  has_error_csv: boolean;
  created_at: string;
};

const GROUPS: Array<{ id: EntityPack["group"]; label: string }> = [
  { id: "crm", label: "CRM" },
  { id: "ams", label: "AMS / book" },
  { id: "desk", label: "Desk config" },
];

export function ImportExportHub({ initialJobs }: { initialJobs: JobRow[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [active, setActive] = useState<EntityPack | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [commit, setCommit] = useState<CommitResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(
    () => GROUPS.map((group) => ({ ...group, packs: ENTITY_PACKS.filter((pack) => pack.group === group.id) })),
    [],
  );

  function closeImport() {
    setActive(null);
    setFile(null);
    setPreview(null);
    setCommit(null);
    setBusy(null);
    setError(null);
  }

  async function refreshJobs() {
    const res = await fetch("/api/import-export/jobs");
    if (!res.ok) return;
    setJobs((await res.json()) as JobRow[]);
  }

  async function runPreview() {
    if (!active || !file) return;
    setBusy("preview");
    setError(null);
    setCommit(null);
    const body = new FormData();
    body.set("file", file);
    const res = await fetch(`/api/import-export/${active.key}/preview`, { method: "POST", body });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Preview failed.");
      return;
    }
    setPreview(data as PreviewResult);
  }

  async function runCommit() {
    if (!active || !file) return;
    setBusy("commit");
    setError(null);
    const body = new FormData();
    body.set("file", file);
    const res = await fetch(`/api/import-export/${active.key}/commit`, { method: "POST", body });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Commit failed.");
      return;
    }
    setCommit(data as CommitResult);
    await refreshJobs();
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <section key={group.id}>
          <h2 className="mb-2 text-sm font-semibold text-navy">{group.label}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.packs.map((pack) => (
              <article key={pack.key} className="ff-card flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-navy">{pack.label}</h3>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {capabilityLabel(pack)}
                  </span>
                </div>
                <p className="mt-1 flex-1 text-xs text-muted-foreground">{pack.hint}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Match: {pack.match}</p>
                {pack.coming ? <p className="mt-1 text-[11px] text-muted-foreground">{pack.coming}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/api/import-export/${pack.key}/export`}
                    className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                  >
                    Export CSV
                  </a>
                  {pack.jsonExport ? (
                    <a
                      href={`/api/import-export/${pack.key}/export?format=json`}
                      className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm font-medium text-navy hover:bg-secondary"
                    >
                      Export JSON
                    </a>
                  ) : null}
                  <a
                    href={`/api/import-export/${pack.key}/template`}
                    className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm font-medium text-navy hover:bg-secondary"
                  >
                    Template
                  </a>
                  {canImport(pack) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActive(pack);
                        setFile(null);
                        setPreview(null);
                        setCommit(null);
                        setError(null);
                      }}
                    >
                      Import CSV
                    </Button>
                  ) : (
                    <span className="inline-flex h-8 items-center text-xs text-muted-foreground">Coming</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">Job history</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Who ran the job, when, which entity, rows that landed, and an error CSV when a row failed.
        </p>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No import or export jobs yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Who</th>
                  <th className="py-2 pr-3 font-medium">Entity</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">OK</th>
                  <th className="py-2 pr-3 font-medium">Errors</th>
                  <th className="py-2 font-medium">Errors file</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border/70">
                    <td className="py-2 pr-3 text-navy">{formatWhen(job.created_at)}</td>
                    <td className="py-2 pr-3 text-navy">{job.actor_name}</td>
                    <td className="py-2 pr-3 text-navy">{job.entity}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {job.action}
                      {job.status !== "ok" ? ` · ${job.status}` : ""}
                    </td>
                    <td className="py-2 pr-3 text-navy">{job.rows_ok}</td>
                    <td className="py-2 pr-3 text-navy">{job.rows_error}</td>
                    <td className="py-2">
                      {job.has_error_csv ? (
                        <a
                          href={`/api/import-export/jobs/${job.id}/errors`}
                          className="text-sm text-primary hover:underline"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && closeImport()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>Import {active?.label}</DialogTitle>
            <DialogDescription>
              Upload a CSV, dry-run the match, then commit. Import never deletes customer rows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setCommit(null);
                setError(null);
              }}
              className="block w-full text-sm"
            />
            {file ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-navy">{file.name}</span>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  data-ff-delete-file
                  onClick={() => {
                    if (!confirmHardDelete(`the file “${file.name}”`)) return;
                    setFile(null);
                    setPreview(null);
                    setCommit(null);
                    setError(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={!file || busy !== null} onClick={runPreview}>
                {busy === "preview" ? "Validating…" : "Validate + preview"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!preview || !file || busy !== null || Boolean(commit)}
                onClick={runCommit}
              >
                {busy === "commit" ? "Committing…" : "Commit import"}
              </Button>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {preview ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {preview.createCount} create · {preview.updateCount} update · {preview.skipCount} skip ·{" "}
                  {preview.errorCount} error
                </p>
                <div className="max-h-72 overflow-auto rounded-md border border-border">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="px-2 py-1.5 font-medium">Line</th>
                        <th className="px-2 py-1.5 font-medium">Action</th>
                        <th className="px-2 py-1.5 font-medium">Record</th>
                        <th className="px-2 py-1.5 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((item) => (
                        <tr key={`${item.line}-${item.key}`} className="border-b border-border/60">
                          <td className="px-2 py-1.5">{item.line}</td>
                          <td className={cn("px-2 py-1.5 font-medium", actionClass(item.action))}>{item.action}</td>
                          <td className="px-2 py-1.5 text-navy">{item.label || item.key}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{item.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {file ? "Run validate to see create vs update before anything writes." : "Choose a CSV to start."}
              </p>
            )}
            {commit ? (
              <p className="text-sm text-navy">
                Committed {commit.rowsOk} row{commit.rowsOk === 1 ? "" : "s"} ({commit.rowsCreate} created,{" "}
                {commit.rowsUpdate} updated, {commit.rowsSkip} skipped, {commit.rowsError} errors).
                {commit.errorCsv ? " Download the error CSV from job history." : ""}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function capabilityLabel(pack: EntityPack): string {
  if (pack.capability === "full") return "Import + export";
  if (pack.capability === "careful") return "Careful import";
  if (pack.capability === "stub") return "Export + stub import";
  return "Export";
}

function actionClass(action: string): string {
  if (action === "create") return "text-green-700";
  if (action === "update") return "text-navy";
  if (action === "error") return "text-destructive";
  return "text-muted-foreground";
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
