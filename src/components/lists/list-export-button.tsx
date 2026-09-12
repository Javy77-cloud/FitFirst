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
  const label =
    selected.length > 0
      ? `Export CSV (${selected.length})`
      : filteredIds.length > 0
        ? `Export CSV (${filteredIds.length} filtered)`
        : "Export CSV";

  async function run() {
    if (ids.length === 0) {
      onMessage("Select rows or apply a filter first.");
      return;
    }
    onBusy(true);
    const form = new FormData();
    form.set("module", module);
    for (const id of ids) form.append("recordId", id);
    const result = await exportSelectedCsv(form);
    onBusy(false);
    onMessage(result.message);
    if (result.ok && result.csv && result.filename) {
      downloadCsv(result.filename, result.csv);
    }
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
