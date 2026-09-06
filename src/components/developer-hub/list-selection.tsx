"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SelectionActionsMenu } from "@/components/lists/selection-actions-menu";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import type { CrmListModule, SelectionRecord } from "@/lib/lists/selection-actions";

type MacroOption = { id: string; name: string; kind?: string };
type ButtonOption = {
  id: string;
  label: string;
  actionKind: string;
  functionApiName?: string | null;
};

const SelectionContext = createContext<{
  selected: string[];
  toggle: (id: string) => void;
  setAll: (ids: string[]) => void;
  clear: () => void;
} | null>(null);

export function ListSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const value = useMemo(
    () => ({
      selected,
      toggle: (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])),
      setAll: (ids: string[]) => setSelected(ids),
      clear: () => setSelected([]),
    }),
    [selected],
  );
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("ListSelectionProvider is required.");
  return ctx;
}

export function SelectRowCheckbox({ id }: { id: string }) {
  const { selected, toggle } = useSelection();
  return (
    <input
      type="checkbox"
      checked={selected.includes(id)}
      onChange={() => toggle(id)}
      aria-label="Select row"
    />
  );
}

export function SelectAllCheckbox({ ids }: { ids: string[] }) {
  const { selected, setAll, clear } = useSelection();
  const allOn = ids.length > 0 && ids.every((id) => selected.includes(id));
  return (
    <input
      type="checkbox"
      checked={allOn}
      onChange={() => (allOn ? clear() : setAll(ids))}
      aria-label="Select all rows"
    />
  );
}

export function ListMassBar({
  module,
  macros,
  buttons = [],
  recordIds = [],
  records = [],
  showMacrosLink = true,
}: {
  module: CrmListModule;
  macros: MacroOption[];
  buttons?: ButtonOption[];
  recordIds?: string[];
  records?: SelectionRecord[];
  showFollowUp?: boolean;
  showMacrosLink?: boolean;
}) {
  const { selected, clear } = useSelection();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [widget, setWidget] = useState<{ name: string; url: string | null } | null>(null);
  const resolvedRecords = records.length
    ? records
    : recordIds.map((id) => ({ id, label: id }));

  return (
    <div className="mb-3 space-y-2 print:hidden">
      <div
        className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
        data-testid="list-selection-bar"
      >
        {recordIds.length ? <SelectAllCheckbox ids={recordIds} /> : null}
        <span className="text-xs text-muted-foreground">
          {selected.length === 0
            ? "Select rows for Actions"
            : `${selected.length} selected`}
        </span>
        <SelectionActionsMenu
          module={module}
          selected={selected}
          records={resolvedRecords}
          macros={macros}
          buttons={buttons}
          busy={busy}
          onBusy={setBusy}
          onMessage={setMessage}
          onWidget={setWidget}
          onClear={clear}
        />
        {selected.length ? (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
            onClick={clear}
          >
            Clear
          </button>
        ) : null}
        {showMacrosLink ? (
          <a
            href="/settings/developer-hub/macros"
            className="ml-auto text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Settings · Macros
          </a>
        ) : null}
      </div>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
      {widget ? <WidgetHost name={widget.name} url={widget.url} onClose={() => setWidget(null)} /> : null}
    </div>
  );
}
