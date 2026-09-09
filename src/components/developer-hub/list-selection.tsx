"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SelectionActionsMenu } from "@/components/lists/selection-actions-menu";
import {
  MassUpdateMenu,
  type MassUpdateFieldOptionMap,
  type MassUpdateOwner,
  type MassUpdateTemplate,
} from "@/components/lists/mass-update";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import { massUpdateColumnsFromVisible, selectAllMode } from "@/lib/lists/mass-update";
import type { ListColumn } from "@/lib/list-columns";
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
  visibleIds: string[];
  matchingIds: string[];
  listColumns: ListColumn[];
  visibleColumnIds: string[];
  toggle: (id: string) => void;
  setAll: (ids: string[]) => void;
  setScope: (visibleIds: string[], matchingIds: string[]) => void;
  setVisibleColumns: (columns: ListColumn[], visibleIds: string[]) => void;
  clear: () => void;
} | null>(null);


function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function sameColumns(left: ListColumn[], right: ListColumn[]) {
  return (
    left.length === right.length &&
    left.every((column, index) => column.id === right[index]?.id && column.label === right[index]?.label)
  );
}

export function ListSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [matchingIds, setMatchingIds] = useState<string[]>([]);
  const [listColumns, setListColumns] = useState<ListColumn[]>([]);
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([]);
  const value = useMemo(
    () => ({
      selected,
      visibleIds,
      matchingIds,
      listColumns,
      visibleColumnIds,
      toggle: (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])),
      setAll: (ids: string[]) => setSelected(ids),
      setScope: (nextVisible: string[], nextMatching: string[]) => {
        setVisibleIds((prev) => (sameIds(prev, nextVisible) ? prev : nextVisible));
        setMatchingIds((prev) => (sameIds(prev, nextMatching) ? prev : nextMatching));
      },
      setVisibleColumns: (columns: ListColumn[], nextVisible: string[]) => {
        setListColumns((prev) => (sameColumns(prev, columns) ? prev : columns));
        setVisibleColumnIds((prev) => (sameIds(prev, nextVisible) ? prev : nextVisible));
      },
      clear: () => setSelected([]),
    }),
    [listColumns, matchingIds, selected, visibleColumnIds, visibleIds],
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

export function useOptionalSelection() {
  return useContext(SelectionContext);
}

export function SelectAllCheckbox({ ids }: { ids: string[] }) {
  const { selected, setAll, clear, visibleIds, matchingIds } = useSelection();
  const pageIds = visibleIds.length ? visibleIds : ids;
  const matchIds = matchingIds.length ? matchingIds : ids;
  const mode = selectAllMode(pageIds, matchIds, selected);
  const checked = mode === "page" || mode === "matching";
  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => (checked ? clear() : setAll(pageIds))}
        aria-label="Select visible rows"
        data-testid="list-select-visible"
      />
      {mode === "page" && matchIds.length > pageIds.length ? (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          data-testid="list-select-matching"
          onClick={() => setAll(matchIds)}
        >
          Select all {matchIds.length} matching
        </button>
      ) : null}
      {mode === "matching" && matchIds.length > pageIds.length ? (
        <span className="text-xs text-muted-foreground">All {matchIds.length} matching</span>
      ) : null}
    </span>
  );
}

export function ListMassBar({
  module,
  macros,
  buttons = [],
  recordIds = [],
  records = [],
  owners = [],
  templates = [],
  fieldOptions = {},
  showMacrosLink = true,
}: {
  module: CrmListModule;
  macros: MacroOption[];
  buttons?: ButtonOption[];
  recordIds?: string[];
  records?: SelectionRecord[];
  owners?: MassUpdateOwner[];
  templates?: MassUpdateTemplate[];
  fieldOptions?: MassUpdateFieldOptionMap;
  showFollowUp?: boolean;
  showMacrosLink?: boolean;
}) {
  const { selected, clear, listColumns, visibleColumnIds } = useSelection();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [widget, setWidget] = useState<{ name: string; url: string | null } | null>(null);
  const resolvedRecords = records.length
    ? records
    : recordIds.map((id) => ({ id, label: id }));
  const massFields = useMemo(
    () => massUpdateColumnsFromVisible(listColumns, visibleColumnIds),
    [listColumns, visibleColumnIds],
  );

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
        <MassUpdateMenu
          module={module}
          selected={selected}
          fields={massFields}
          fieldOptions={fieldOptions}
          owners={owners}
          templates={templates}
          busy={busy}
          onBusy={setBusy}
          onMessage={setMessage}
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
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Settings · Macros
          </a>
        ) : null}
        <span
          data-ff-list-chrome=""
          className="ml-auto inline-flex items-center gap-1"
          aria-label="List columns and settings"
        />
      </div>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
      {widget ? <WidgetHost name={widget.name} url={widget.url} onClose={() => setWidget(null)} /> : null}
    </div>
  );
}
