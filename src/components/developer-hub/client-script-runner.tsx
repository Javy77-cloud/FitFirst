"use client";

import { useEffect, useState } from "react";
import { runClientScript } from "@/lib/developer-hub/client-scripts";

export type ClientScriptSeed = {
  id: string;
  event: string;
  fieldName: string | null;
  body: string;
};

export function ClientScriptRunner({
  scripts,
  rootSelector,
}: {
  scripts: ClientScriptSeed[];
  rootSelector?: string;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const root = rootSelector
      ? document.querySelector(rootSelector)
      : document.querySelector("main");
    if (!root) return;

    function fieldEl(name: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
      return root!.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[name="${name}"]`,
      );
    }

    const api = {
      getValue: (field: string) => fieldEl(field)?.value ?? "",
      setValue: (field: string, value: string) => {
        const el = fieldEl(field);
        if (el) {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
      showError: (field: string, message: string) => {
        setErrors((prev) => ({ ...prev, [field]: message }));
        fieldEl(field)?.setAttribute("aria-invalid", "true");
      },
    };

    function runMatching(eventName: string, field?: string) {
      for (const script of scripts) {
        if (script.event !== eventName) continue;
        if (eventName === "onChange" && script.fieldName && field && script.fieldName !== field) {
          continue;
        }
        runClientScript(script.body, api);
      }
    }

    runMatching("onLoad");

    function onChange(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
        return;
      }
      const field = target.getAttribute("name");
      if (!field) return;
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      runMatching("onChange", field);
    }

    root.addEventListener("change", onChange);
    root.addEventListener("input", onChange);
    return () => {
      root.removeEventListener("change", onChange);
      root.removeEventListener("input", onChange);
    };
  }, [rootSelector, scripts]);

  const entries = Object.entries(errors);
  if (entries.length === 0) return null;

  return (
    <div className="mb-3 space-y-1">
      {entries.map(([field, message]) => (
        <p key={field} className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ))}
    </div>
  );
}
