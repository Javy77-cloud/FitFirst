"use client";

import { useState } from "react";
import { clickDeskButton, runDeskMacro } from "@/app/actions/developer-hub";
import { Button } from "@/components/ui/button";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import type { DevHubModule } from "@/lib/developer-hub/types";

type MacroOption = { id: string; name: string; kind?: string };
type ButtonOption = { id: string; label: string; actionKind: string };

export function RecordDeveloperActions({
  module,
  recordId,
  macros,
  buttons,
  showFollowUp = false,
}: {
  module: DevHubModule;
  recordId: string;
  macros: MacroOption[];
  buttons: ButtonOption[];
  showFollowUp?: boolean;
}) {
  const standardMacros = showFollowUp ? macros.filter((macro) => macro.kind !== "follow_up") : macros;
  const followUpMacros = macros.filter((macro) => macro.kind === "follow_up");
  const [macroId, setMacroId] = useState(standardMacros[0]?.id ?? "");
  const [followUpId, setFollowUpId] = useState(followUpMacros[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [widget, setWidget] = useState<{ name: string; url: string | null } | null>(null);

  if (macros.length === 0 && buttons.length === 0 && !showFollowUp) return null;

  async function runSelected(id: string) {
    if (!id) return;
    setBusy(true);
    const form = new FormData();
    form.set("macroId", id);
    form.set("module", module);
    form.append("recordId", recordId);
    const result = await runDeskMacro(form);
    setMessage(result.summary);
    setBusy(false);
  }

  async function runMacro() {
    await runSelected(macroId);
  }

  async function runFollowUp() {
    await runSelected(followUpId);
  }

  async function onButton(buttonId: string) {
    setBusy(true);
    const form = new FormData();
    form.set("buttonId", buttonId);
    form.set("recordId", recordId);
    const result = await clickDeskButton(form);
    setMessage(result.message);
    if (result.kind === "url" && result.url) window.open(result.url, "_blank", "noopener,noreferrer");
    if (result.kind === "widget") {
      setWidget({ name: result.widgetName ?? "Widget", url: result.widgetUrl ?? null });
    }
    setBusy(false);
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
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
        ) : null}
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
            onClick={() => void onButton(button.id)}
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
