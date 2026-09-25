"use client";

import { useMemo, useState } from "react";
import { saveDeskMacro } from "@/app/actions/developer-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { allowedFieldsForModules, normalizeMacroModules, parseMacroActions, parseMacroKind } from "@/lib/developer-hub/macros";
import {
  DEV_HUB_MODULES,
  DEV_HUB_MODULE_LABEL,
  MACRO_KIND_LABEL,
  MACRO_KINDS,
  MACRO_STAGE_OPTIONS,
  type DevHubModule,
} from "@/lib/developer-hub/types";
type MacroFormRow = {
  id: string;
  name: string;
  description: string | null;
  module: string;
  modules?: string[] | null;
  kind?: string | null;
  enabled: boolean;
  actions: unknown;
};

export function MacroForm({
  macro,
  templates,
}: {
  macro?: MacroFormRow;
  templates: Array<{ id: string; name: string }>;
}) {
  const actions = parseMacroActions(macro?.actions);
  const initialModules = normalizeMacroModules(macro?.module ?? "leads", macro?.modules);
  const [modules, setModules] = useState<DevHubModule[]>(initialModules.length ? initialModules : ["leads"]);
  const fields = useMemo(() => allowedFieldsForModules(modules), [modules]);
  const kind = parseMacroKind(macro?.kind);
  const stageCapable = modules.some((item) => item === "deals" || item === "quotes");

  function toggleModule(item: DevHubModule) {
    setModules((current) => {
      if (current.includes(item)) {
        const next = current.filter((value) => value !== item);
        return next.length ? next : current;
      }
      return [...current, item];
    });
  }

  return (
    <form action={saveDeskMacro} className="ff-card max-w-3xl space-y-4 p-4">
      {macro ? <input type="hidden" name="id" value={macro.id} /> : null}
      <div>
        <Label className="text-xs">Name</Label>
        <Input name="name" defaultValue={macro?.name} required className="mt-1 h-8" />
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea name="description" defaultValue={macro?.description ?? ""} className="mt-1" />
      </div>
      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-navy">Target modules</legend>

        <div className="grid gap-2 sm:grid-cols-2">
          {DEV_HUB_MODULES.map((item) => (
            <label key={item} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="modules"
                value={item}
                checked={modules.includes(item)}
                onChange={() => toggleModule(item)}
              />
              {DEV_HUB_MODULE_LABEL[item]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Kind</Label>
          <select
            name="kind"
            defaultValue={kind}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {MACRO_KINDS.map((item) => (
              <option key={item} value={item}>
                {MACRO_KIND_LABEL[item]}
              </option>
            ))}
          </select>

        </div>
        <label className="mt-6 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={macro?.enabled ?? true} />
          Enabled (still never auto-runs)
        </label>
      </div>

      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-navy">Email stub (≤1)</legend>

        <select
          name="emailTemplateId"
          defaultValue={actions.email?.templateId ?? ""}
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">Stub subject / body</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <Input name="emailSubject" placeholder="Subject" defaultValue={actions.email?.subject ?? ""} className="h-8" />
        <Textarea name="emailBody" placeholder="Body" defaultValue={actions.email?.body ?? ""} />
      </fieldset>

      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-navy">Field updates (≤3)</legend>
        {[0, 1, 2].map((index) => {
          const row = actions.fieldUpdates[index];
          return (
            <div key={index} className="grid gap-2 sm:grid-cols-2">
              <select
                name={`updateField${index}`}
                defaultValue={row?.field && fields.includes(row.field) ? row.field : ""}
                className="h-8 rounded-md border border-input bg-card px-2 text-sm"
              >
                <option value="">—</option>
                {fields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
              <Input name={`updateValue${index}`} defaultValue={row?.value ?? ""} className="h-8" />
            </div>
          );
        })}
      </fieldset>

      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-navy">Create tasks (≤3)</legend>
        {[0, 1, 2].map((index) => {
          const row = actions.createTasks[index];
          return (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px_80px]">
              <Input name={`taskTitle${index}`} placeholder="Task title" defaultValue={row?.title ?? ""} className="h-8" />
              <Input name={`taskKind${index}`} placeholder="kind" defaultValue={row?.kind ?? "macro"} className="h-8" />
              <Input
                name={`taskDue${index}`}
                type="number"
                placeholder="days"
                defaultValue={row?.dueInDays ?? ""}
                className="h-8"
              />
            </div>
          );
        })}
      </fieldset>

      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-navy">Stage move</legend>

        <select
          name="stageMove"
          defaultValue={actions.stageMove?.stage ?? ""}
          disabled={!stageCapable}
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm disabled:opacity-60"
        >
          <option value="">No stage change</option>
          {MACRO_STAGE_OPTIONS.map((stage) => (
            <option key={stage} value={stage}>
              {stage.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </fieldset>

      <Button type="submit" size="sm">
        {macro ? "Save macro" : "Create macro"}
      </Button>
    </form>
  );
}
