"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, Columns3 } from "lucide-react";
import {
  resetAgentColumnLayout,
  saveAgencyColumnDefault,
  saveAgentColumnLayout,
} from "@/app/actions/desk";
import { moveColumn, resolveColumnLayout, type LayoutSource } from "@/lib/crm/lists";
import { cn } from "@/lib/utils";

export type PickerColumn = {
  id: string;
  header: string;
  defaultVisible?: boolean;
  hideable?: boolean;
};

export type ColumnLayoutState = {
  ids: string[];
  source: LayoutSource;
  hasAgentOverride: boolean;
};

type Props = {
  tableId: string;
  columns: PickerColumn[];
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  layout: ColumnLayoutState;
  agentName: string;
  canSetAgencyDefault: boolean;
};

function applyLayout(root: HTMLElement, visibleIds: string[]) {
  const visible = new Set(visibleIds);
  root.querySelectorAll<HTMLElement>("[data-col]").forEach((el) => {
    const id = el.dataset.col;
    if (!id) return;
    el.hidden = !visible.has(id);
  });
  root.querySelectorAll("tr").forEach((row) => {
    const cells = [...row.querySelectorAll<HTMLElement>("[data-col]")];
    if (cells.length === 0) return;
    cells
      .sort((a, b) => {
        const ai = visibleIds.indexOf(a.dataset.col ?? "");
        const bi = visibleIds.indexOf(b.dataset.col ?? "");
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .forEach((cell) => row.appendChild(cell));
  });
}

export function ColumnPickerClient({
  tableId,
  columns,
  children,
  toolbar,
  layout,
  agentName,
  canSetAgencyDefault,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ids, setIds] = useState(layout.ids);
  const [source, setSource] = useState(layout.source);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setIds(layout.ids);
    setSource(layout.source);
  }, [layout.ids, layout.source, tableId]);

  const visibleIds = useMemo(
    () => resolveColumnLayout(columns, { agentIds: ids, agencyIds: null }).ids,
    [columns, ids],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    applyLayout(root, visibleIds);
  }, [visibleIds, children]);

  function persist(next: string[], nextSource: LayoutSource = "agent") {
    setIds(next);
    setSource(nextSource);
    const form = new FormData();
    form.set("tableId", tableId);
    form.set("columnIds", next.join(","));
    startTransition(() => {
      void saveAgentColumnLayout(form);
    });
  }

  function toggle(id: string, hideable: boolean) {
    if (!hideable) return;
    const next = visibleIds.includes(id)
      ? visibleIds.filter((value) => value !== id)
      : [...visibleIds, id];
    persist(
      next.length
        ? next
        : columns.filter((column) => column.defaultVisible !== false).map((column) => column.id),
    );
  }

  function shift(id: string, direction: -1 | 1) {
    persist(moveColumn(visibleIds, id, direction));
  }

  const sourceLabel =
    source === "agent"
      ? `Saved for ${agentName}`
      : source === "agency"
        ? "Agency default"
        : "Product default";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        <details className="relative">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[0.8rem] font-medium text-navy hover:bg-muted">
            <Columns3 className="size-3.5" />
            Columns
          </summary>
          <div className="absolute right-0 z-30 mt-1 w-64 rounded-md border border-border bg-card p-2 shadow-md">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {sourceLabel}
            </p>
            {columns.map((col) => {
              const on = visibleIds.includes(col.id);
              const hideable = col.hideable !== false;
              return (
                <div key={col.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!hideable}
                    onClick={() => toggle(col.id, hideable)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-navy hover:bg-muted disabled:opacity-50"
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {on ? <Check className="size-3" /> : null}
                    </span>
                    <span className="truncate">{col.header}</span>
                  </button>
                  {on ? (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label={`Move ${col.header} left`}
                        className="rounded px-1 text-navy hover:bg-muted"
                        onClick={() => shift(col.id, -1)}
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${col.header} right`}
                        className="rounded px-1 text-navy hover:bg-muted"
                        onClick={() => shift(col.id, 1)}
                      >
                        <ChevronDown className="size-3" />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="mt-2 space-y-1 border-t border-border pt-2">
              {source === "agent" ? (
                <form action={resetAgentColumnLayout}>
                  <input type="hidden" name="tableId" value={tableId} />
                  <button type="submit" className="w-full rounded-md px-2 py-1 text-left text-xs text-primary hover:bg-muted">
                    Use agency default
                  </button>
                </form>
              ) : null}
              {canSetAgencyDefault ? (
                <form action={saveAgencyColumnDefault}>
                  <input type="hidden" name="tableId" value={tableId} />
                  <input type="hidden" name="columnIds" value={visibleIds.join(",")} />
                  <button type="submit" className="w-full rounded-md px-2 py-1 text-left text-xs text-navy hover:bg-muted">
                    Save as agency default
                  </button>
                </form>
              ) : null}
              <p className="px-2 text-[10px] text-muted-foreground">
                Layout is per agent. Colors and fonts stay on admin branding.
              </p>
            </div>
          </div>
        </details>
      </div>
      <div ref={rootRef}>{children}</div>
    </div>
  );
}
