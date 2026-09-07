"use client";

import { useState } from "react";
import { deleteFollowUpTemplate, saveFollowUpTemplate } from "@/app/actions/lead-follow-up";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import {
  FOLLOW_UP_DELAY_UNIT_LABELS,
  FOLLOW_UP_DELAY_UNITS,
  FOLLOW_UP_METHODS,
  REMIND_VIA_CHANNELS,
  REMIND_VIA_LABELS,
  TEMPLATE_TRIGGER_STATUSES,
  dedupeFollowUpSteps,
  followUpTemplateFullName,
  remindViaLabel,
} from "@/lib/leads/follow-up-templates";
import { LEAD_QUEUE_STATUS_FILTERS, leadStatusLabel } from "@/lib/leads/queue";

export type FollowUpTemplateView = {
  id: string;
  name: string;
  triggerStatus: string;
  enabled: boolean;
  steps: Array<{
    id: string;
    sortOrder: number;
    method: string;
    delayAmount: number;
    delayUnit: string;
    message: string | null;
    remindVia: string;
  }>;
};

const EMPTY_STEP_DEFAULTS = [
  { method: "call", delayAmount: "5", delayUnit: "minutes", message: "", remindVia: "task" },
  { method: "text", delayAmount: "30", delayUnit: "minutes", message: "", remindVia: "task" },
  { method: "email", delayAmount: "2", delayUnit: "hours", message: "", remindVia: "task" },
  { method: "call", delayAmount: "1", delayUnit: "days", message: "", remindVia: "task" },
] as const;

function emptySteps() {
  return EMPTY_STEP_DEFAULTS.map((step) => ({ ...step }));
}

function triggerOptions() {
  const seeded = TEMPLATE_TRIGGER_STATUSES.map((row) => ({
    value: row.value,
    label: row.label,
  }));
  const extra = LEAD_QUEUE_STATUS_FILTERS.filter(
    (option) => !seeded.some((row) => row.value === option.value),
  ).map((option) => ({ value: option.value, label: option.label }));
  return [...seeded, ...extra];
}

export function FollowUpTemplatesPanel({ templates }: { templates: FollowUpTemplateView[] }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const editing =
    editingId === "new"
      ? {
          id: "",
          name: "",
          triggerStatus: "new",
          enabled: true,
          steps: [],
        }
      : templates.find((row) => row.id === editingId) ?? null;

  const stepDefaults = editing
    ? [0, 1, 2, 3].map((index) => {
        const step = dedupeFollowUpSteps(editing.steps)[index];
        const fallback = EMPTY_STEP_DEFAULTS[index];
        return {
          method: step?.method || fallback.method,
          delayAmount: step ? String(step.delayAmount) : fallback.delayAmount,
          delayUnit: step?.delayUnit ?? fallback.delayUnit,
          message: step?.message ?? "",
          remindVia: step?.remindVia ?? fallback.remindVia,
        };
      })
    : emptySteps();

  return (
    <>
      <Button type="button" size="xs" variant="outline" onClick={() => setOpen(true)}>
        Follow-up Templates
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditingId(null);
        }}
      >
        <DialogContent className="w-[min(100%-2rem,900px)] max-w-[900px] gap-3 overflow-visible p-5 sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Follow-up Templates</DialogTitle>
            <DialogDescription>
              Each template maps to one status. New starts Aggressive. Contacted starts Default.
              Warm starts Steady. Cold starts Drip. Overrides stay per lead. Each step has Remind
              via (Task, Pop-up, or Email).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {editing ? (
              <form
                action={async (formData) => {
                  await saveFollowUpTemplate(formData);
                  setEditingId(null);
                }}
                className="space-y-3"
              >
                {editing.id ? <input type="hidden" name="templateId" value={editing.id} /> : null}
                <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
                  <div>
                    <Label htmlFor="template-name" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="template-name"
                      name="name"
                      required
                      defaultValue={editing.name}
                      className="mt-1 h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-status" className="text-xs">
                      Status
                    </Label>
                    <select
                      id="template-status"
                      name="triggerStatus"
                      defaultValue={editing.triggerStatus}
                      className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                    >
                      {triggerOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-muted-foreground">
                      <th className="w-[7.25rem] pb-1.5 pr-1.5 font-medium">Method</th>
                      <th className="w-[4.5rem] pb-1.5 pr-1.5 font-medium">Delay</th>
                      <th className="w-[5.75rem] pb-1.5 pr-1.5 font-medium">Unit</th>
                      <th className="w-[6.75rem] pb-1.5 pr-1.5 font-medium">Remind via</th>
                      <th className="pb-1.5 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stepDefaults.map((step, index) => (
                      <tr key={index}>
                        <td className="py-1 pr-1.5 align-middle">
                          <select
                            name={`stepMethod${index}`}
                            defaultValue={step.method || "call"}
                            aria-label={`Step ${index + 1} method`}
                            className="h-8 w-full rounded-md border border-border bg-background px-1 text-xs"
                          >
                            {FOLLOW_UP_METHODS.map((method) => (
                              <option key={method} value={method}>
                                {method}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 pr-1.5 align-middle">
                          <Input
                            name={`stepDelay${index}`}
                            type="number"
                            min={0}
                            defaultValue={step.delayAmount}
                            aria-label={`Step ${index + 1} delay`}
                            className="h-8"
                          />
                        </td>
                        <td className="py-1 pr-1.5 align-middle">
                          <select
                            name={`stepUnit${index}`}
                            defaultValue={step.delayUnit}
                            aria-label={`Step ${index + 1} unit`}
                            className="h-8 w-full rounded-md border border-border bg-background px-1 text-xs"
                          >
                            {FOLLOW_UP_DELAY_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {FOLLOW_UP_DELAY_UNIT_LABELS[unit]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 pr-1.5 align-middle">
                          <select
                            name={`stepRemindVia${index}`}
                            defaultValue={step.remindVia}
                            aria-label={`Step ${index + 1} remind via`}
                            className="h-8 w-full rounded-md border border-border bg-background px-1 text-xs"
                          >
                            {REMIND_VIA_CHANNELS.map((channel) => (
                              <option key={channel} value={channel}>
                                {REMIND_VIA_LABELS[channel]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 align-middle">
                          <Input
                            name={`stepMessage${index}`}
                            defaultValue={step.message}
                            placeholder="optional"
                            aria-label={`Step ${index + 1} message`}
                            className="h-8"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm">
                    Save template
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <Button type="button" size="sm" onClick={() => setEditingId("new")}>
                  New template
                </Button>
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No templates yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {templates.map((template) => (
                      <li key={template.id} className="rounded-md border border-border bg-card p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-navy">
                              {followUpTemplateFullName(template)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Fires on {leadStatusLabel(template.triggerStatus)} · {template.steps.length}{" "}
                              {template.steps.length === 1 ? "step" : "steps"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" size="xs" variant="outline" onClick={() => setEditingId(template.id)}>
                              Edit
                            </Button>
                            <form
                              action={deleteFollowUpTemplate}
                              onSubmit={(event) => {
                                if (!confirmHardDelete(`template “${template.name}”`)) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="templateId" value={template.id} />
                              <Button type="submit" size="xs" variant="destructive">
                                Delete
                              </Button>
                            </form>
                          </div>
                        </div>
                        <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {dedupeFollowUpSteps(template.steps).map((step) => (
                            <li key={step.id}>
                              {step.method} · {step.delayAmount}{" "}
                              {FOLLOW_UP_DELAY_UNIT_LABELS[
                                step.delayUnit as keyof typeof FOLLOW_UP_DELAY_UNIT_LABELS
                              ] ?? step.delayUnit}{" "}
                              · Remind via {remindViaLabel(step.remindVia)}
                              {step.message ? ` — ${step.message}` : ""}
                            </li>
                          ))}
                        </ol>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
