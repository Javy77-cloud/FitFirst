"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clickDeskButton, runDeskMacro } from "@/app/actions/developer-hub";
import { Button } from "@/components/ui/button";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import type { DevHubModule } from "@/lib/developer-hub/types";

type MacroOption = { id: string; name: string };
type ButtonOption = {
  id: string;
  label: string;
  actionKind: string;
  functionApiName: string | null;
};

const SelectionContext = createContext<{
  selected: string[];
  toggle: (id: string) => void;
  clear: () => void;
} | null>(null);

export function ListSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const value = useMemo(
    () => ({
      selected,
      toggle: (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])),
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

export function ListMassBar({
  module,
  macros,
  buttons,
}: {
  module: DevHubModule;
  macros: MacroOption[];
  buttons: ButtonOption[];
}) {
  const { selected, clear } = useSelection();
  const [macroId, setMacroId] = useState(macros[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [widget, setWidget] = useState<{ name: string; url: string | null } | null>(null);

  async function runMacro() {
    if (!macroId || selected.length === 0) {
      setMessage("Select one or more rows, then run a macro.");
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.set("macroId", macroId);
    form.set("module", module);
    for (const id of selected) form.append("recordId", id);
    const result = await runDeskMacro(form);
    setMessage(result.summary);
    setBusy(false);
    if (result.ok) clear();
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

  if (macros.length === 0 && buttons.length === 0) return null;

  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {selected.length} selected
        </span>
        {macros.length ? (
          <>
            <select
              value={macroId}
              onChange={(event) => setMacroId(event.target.value)}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs"
            >
              {macros.map((macro) => (
                <option key={macro.id} value={macro.id}>
                  {macro.name}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" onClick={() => void runMacro()} disabled={busy}>
              Run Macro
            </Button>
          </>
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
      </div>
      {message ? <p className="text-sm text-navy">{message}</p> : null}
      {widget ? <WidgetHost name={widget.name} url={widget.url} onClose={() => setWidget(null)} /> : null}
    </div>
  );
}
