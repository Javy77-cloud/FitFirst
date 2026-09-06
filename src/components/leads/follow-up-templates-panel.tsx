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
  TEMPLATE_TRIGGER_STATUSES,
  followUpTemplateFullName,
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
  }>;
};

function emptySteps() {
  return [0, 1, 2, 3].map((index) => ({
    method: index === 0 ? "call" : "",
    delayAmount: index === 0 ? "5" : "",
    delayUnit: "minutes",
    message: "",
  }));
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
        const step = editing.steps[index];
        return {
          method: step?.method ?? "",
          delayAmount: step ? String(step.delayAmount) : "",
          delayUnit: step?.delayUnit ?? "minutes",
          message: step?.message ?? "",
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
        <DialogContent className="w-[min(100%-2rem,600px)] max-w-[600px] gap-3 p-5 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Follow-up Templates</DialogTitle>
            <DialogDescription>
              Each template maps to one status. New is Hot. Status change swaps the matching
              template. Override stays on the lead row.
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
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[5.5rem_3.75rem_5.25rem_minmax(0,1fr)] gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span>Method</span>
                    <span>Delay</span>
                    <span>Unit</span>
                    <span>Message</span>
                  </div>
                  {stepDefaults.map((step, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[5.5rem_3.75rem_5.25rem_minmax(0,1fr)] items-center gap-1.5"
                    >
                      <select
                        name={`stepMethod${index}`}
                        defaultValue={step.method}
                        aria-label={`Step ${index + 1} method`}
                        className="h-8 w-full rounded-md border border-border bg-background px-1 text-xs"
                      >
                        <option value="">Skip</option>
                        {FOLLOW_UP_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                      <Input
                        name={`stepDelay${index}`}
                        type="number"
                        min={0}
                        defaultValue={step.delayAmount}
                        aria-label={`Step ${index + 1} delay`}
                        className="h-8"
                      />
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
                      <Input
                        name={`stepMessage${index}`}
                        defaultValue={step.message}
                        placeholder="optional"
                        aria-label={`Step ${index + 1} message`}
                        className="h-8"
                      />
                    </div>
                  ))}
                </div>
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
                          {template.steps.map((step) => (
                            <li key={step.id}>
                              {step.method} · {step.delayAmount}{" "}
                              {FOLLOW_UP_DELAY_UNIT_LABELS[
                                step.delayUnit as keyof typeof FOLLOW_UP_DELAY_UNIT_LABELS
                              ] ?? step.delayUnit}
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
