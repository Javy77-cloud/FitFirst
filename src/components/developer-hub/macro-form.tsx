import { saveDeskMacro } from "@/app/actions/developer-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseMacroActions } from "@/lib/developer-hub/macros";
import {
  ALLOWED_MACRO_FIELDS,
  DEV_HUB_MODULES,
  DEV_HUB_MODULE_LABEL,
  type DevHubModule,
} from "@/lib/developer-hub/types";
import type { DeskMacro } from "@/lib/db/schema";

export function MacroForm({
  macro,
  templates,
}: {
  macro?: DeskMacro;
  templates: Array<{ id: string; name: string }>;
}) {
  const actions = parseMacroActions(macro?.actions);
  const module = (macro?.module ?? "leads") as DevHubModule;
  const fields = ALLOWED_MACRO_FIELDS[module] ?? ALLOWED_MACRO_FIELDS.leads;

  return (
    <form action={saveDeskMacro} className="ff-card max-w-3xl space-y-4 p-4">
      {macro ? <input type="hidden" name="id" value={macro.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Name</Label>
          <Input name="name" defaultValue={macro?.name} required className="mt-1 h-8" />
        </div>
        <div>
          <Label className="text-xs">Module</Label>
          <select
            name="module"
            defaultValue={module}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {DEV_HUB_MODULES.map((item) => (
              <option key={item} value={item}>
                {DEV_HUB_MODULE_LABEL[item]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea name="description" defaultValue={macro?.description ?? ""} className="mt-1" />
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={macro?.enabled ?? true} />
        Enabled (still never auto-runs)
      </label>

      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-navy">Email (≤1)</legend>
        <p className="text-xs text-muted-foreground">
          Queues the outbound stub. Merge tokens: {"{{record.firstName}}"} {"{{record.email}}"}.
        </p>
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
                defaultValue={row?.field ?? ""}
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

      <Button type="submit" size="sm">
        {macro ? "Save macro" : "Create macro"}
      </Button>
    </form>
  );
}
