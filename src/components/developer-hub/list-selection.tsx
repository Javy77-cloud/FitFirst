"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clickDeskButton, runDeskMacro } from "@/app/actions/developer-hub";
import { Button } from "@/components/ui/button";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import type { DevHubModule } from "@/lib/developer-hub/types";

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
  showFollowUp = false,
}: {
  module: DevHubModule;
  macros: MacroOption[];
  buttons?: ButtonOption[];
  recordIds?: string[];
  showFollowUp?: boolean;
}) {
  const { selected, clear } = useSelection();
  const standardMacros = showFollowUp ? macros.filter((macro) => macro.kind !== "follow_up") : macros;
  const followUpMacros = macros.filter((macro) => macro.kind === "follow_up");
  const [macroId, setMacroId] = useState(standardMacros[0]?.id ?? "");
  const [followUpId, setFollowUpId] = useState(followUpMacros[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [widget, setWidget] = useState<{ name: string; url: string | null } | null>(null);

  async function runSelected(id: string, emptyMessage: string) {
    if (!id || selected.length === 0) {
      setMessage(emptyMessage);
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.set("macroId", id);
    form.set("module", module);
    for (const recordId of selected) form.append("recordId", recordId);
    const result = await runDeskMacro(form);
    setMessage(result.summary);
    setBusy(false);
    if (result.ok) clear();
  }

  async function runMacro() {
    await runSelected(macroId, "Select one or more rows, then run a macro.");
  }

  async function runFollowUp() {
    await runSelected(followUpId, "Select one or more rows, then run a follow-up macro.");
  }

  async function runButton(buttonId: string) {
    if (selected.length === 0) {
      setMessage("Select one or more rows for a mass-action button.");
      return;
    }
    setBusy(true);
    const notes: string[] = [];
    for (const id of selected) {
      const form = new FormData();
      form.set("buttonId", buttonId);
      form.set("recordId", id);
      const result = await clickDeskButton(form);
      if (result.kind === "url" && result.url) window.open(result.url, "_blank", "noopener,noreferrer");
      if (result.kind === "widget") {
        setWidget({ name: result.widgetName ?? "Widget", url: result.widgetUrl ?? null });
      }
      notes.push(result.message);
    }
    setMessage(notes[0] ?? "Done.");
    setBusy(false);
  }

  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
        {recordIds.length ? <SelectAllCheckbox ids={recordIds} /> : null}
        <span className="text-xs text-muted-foreground">{selected.length} selected</span>
        {standardMacros.length ? (
          <>
            <select
              value={macroId}
              onChange={(event) => setMacroId(event.target.value)}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs"
            >
              {standardMacros.map((macro) => (
                <option key={macro.id} value={macro.id}>
                  {macro.name}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" onClick={() => void runMacro()} disabled={busy}>
              Run Macro
            </Button>
          </>
        ) : (
          <a href="/settings/developer-hub/macros" className="text-xs text-primary hover:underline">
            No macros for this list — open Settings → Macros
          </a>
        )}
        {showFollowUp ? (
          followUpMacros.length ? (
            <>
              <select
                value={followUpId}
                onChange={(event) => setFollowUpId(event.target.value)}
                className="h-8 rounded-md border border-input bg-card px-2 text-xs"
              >
                {followUpMacros.map((macro) => (
                  <option key={macro.id} value={macro.id}>
                    {macro.name}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" variant="outline" onClick={() => void runFollowUp()} disabled={busy}>
                Run Follow-up Macro
              </Button>
            </>
          ) : (
            <a href="/settings/developer-hub/macros" className="text-xs text-primary hover:underline">
              No follow-up macros — define one in Settings
            </a>
          )
        ) : null}
        {buttons.map((button) => (
          <Button
            key={button.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void runButton(button.id)}
          >
            {button.label}
          </Button>
        ))}
        <a href="/settings/developer-hub/macros" className="ml-auto text-xs text-muted-foreground hover:text-primary hover:underline">
          Settings · Macros
        </a>
      </div>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
      {widget ? <WidgetHost name={widget.name} url={widget.url} onClose={() => setWidget(null)} /> : null}
    </div>
  );
}
