"use client";

import { exportSelectedCsv } from "@/app/actions/list-bulk";
import { Button } from "@/components/ui/button";
import { importEntityForCrmList } from "@/lib/lists/list-bulk";
import type { CrmListModule } from "@/lib/lists/selection-actions";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function runListExportCsv(input: {
  module: CrmListModule;
  ids: string[];
}): Promise<{ ok: boolean; message: string }> {
  if (input.ids.length === 0) {
    return { ok: false, message: "Select rows or apply a filter first." };
  }
  const form = new FormData();
  form.set("module", input.module);
  for (const id of input.ids) form.append("recordId", id);
  const result = await exportSelectedCsv(form);
  if (result.ok && result.csv && result.filename) {
    downloadCsv(result.filename, result.csv);
  }
  return { ok: result.ok, message: result.message };
}

export function listExportCsvLabel(selectedCount: number, filteredCount: number): string {
  if (selectedCount > 0) return `Export CSV (${selectedCount})`;
  if (filteredCount > 0) return `Export CSV (${filteredCount} filtered)`;
  return "Export CSV";
}

export function ListExportButton({
  module,
  selected,
  filteredIds,
  busy,
  onBusy,
  onMessage,
}: {
  module: CrmListModule;
  selected: string[];
  /** Filtered page ids — used when nothing is selected (export filtered). */
  filteredIds: string[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onMessage: (message: string | null) => void;
}) {
  if (!importEntityForCrmList(module)) return null;

  const ids = selected.length ? selected : filteredIds;
  const label = listExportCsvLabel(selected.length, filteredIds.length);

  async function run() {
    onBusy(true);
    const result = await runListExportCsv({ module, ids });
    onBusy(false);
    onMessage(result.message);
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={busy || ids.length === 0}
      data-testid="list-export-csv"
      data-ff-list-export=""
      onClick={() => void run()}
    >
      {label}
    </Button>
  );
}
