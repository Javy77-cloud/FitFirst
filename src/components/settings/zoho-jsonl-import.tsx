"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useEffect, useState } from "react";

type ZohoScan = {
  dir: string;
  files: Array<{ module: string; filename: string; bytes: number }>;
  extraFiles: string[];
  missingModules: string[];
  wipeCommand: string;
  importCommand: string;
  assignOwnerCommand: string;
};

export function ZohoJsonlImportCard() {
  const [scan, setScan] = useState<ZohoScan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/import-export/zoho")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not read import/zoho.");
        if (!cancelled) setScan(data as ZohoScan);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not read import/zoho.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="ff-card mb-4 space-y-3 p-4" data-zoho-import="jsonl">
      <div className="text-sm font-semibold text-navy">Zoho JSONL book (records only)</div>

      <ol className="list-decimal space-y-1 pl-5 text-sm text-navy">
        <li>
          Copy JSONL into <code className="text-xs">import/zoho/</code> (one file per module).
        </li>
        <li>
          <code className="text-xs">npm run db:wipe-crm</code>
        </li>
        <li>
          <code className="text-xs">npm run db:import-zoho</code>
        </li>

        <li>
          <code className="text-xs">npm run dev -- --port 43147</code>
        </li>
      </ol>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {scan ? (
        <div className="text-sm">
          {scan.files.length === 0 ? (
            <p className="text-muted-foreground">No JSONL files in import/zoho yet.</p>
          ) : (
            <ul className="space-y-1">
              {scan.files.map((file) => (
                <li key={file.filename}>
                  <span className="font-medium">{file.module}</span>{" "}
                  <span className="text-muted-foreground">{file.filename}</span>
                </li>
              ))}
            </ul>
          )}
          {scan.missingModules.length ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Not in folder yet: {scan.missingModules.join(", ")}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground"><ProcessingLabel>Checking import/zoho…</ProcessingLabel></p>
      )}
    </section>
  );
}
