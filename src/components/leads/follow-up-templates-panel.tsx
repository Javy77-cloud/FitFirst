"use client";

import { useState } from "react";
import { deleteFollowUpTemplate, saveFollowUpTemplate } from "@/app/actions/lead-follow-up";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import { FOLLOW_UP_DELAY_UNITS, FOLLOW_UP_METHODS } from "@/lib/leads/follow-up-templates";
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
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditingId(null);
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Follow-up Templates</SheetTitle>
            <SheetDescription>
              Linked to a lead status. Changing status fires the matching template — no manual
              attach. Override stays on the lead row. Email and text stop at the paid API wall.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6">
            {editing ? (
              <form
                action={async (formData) => {
                  await saveFollowUpTemplate(formData);
                  setEditingId(null);
                }}
                className="space-y-3 rounded-md border border-border bg-card p-3"
              >
                {editing.id ? <input type="hidden" name="templateId" value={editing.id} /> : null}
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
                    Fires when status becomes
                  </Label>
                  <select
                    id="template-status"
                    name="triggerStatus"
                    defaultValue={editing.triggerStatus}
                    className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                  >
                    {LEAD_QUEUE_STATUS_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-navy">Up to four steps</p>
                  {stepDefaults.map((step, index) => (
                    <div key={index} className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-4">
                      <label className="text-xs text-muted-foreground">
                        Method
                        <select
                          name={`stepMethod${index}`}
                          defaultValue={step.method}
                          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-1 text-xs"
                        >
                          <option value="">Skip</option>
                          {FOLLOW_UP_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Delay
                        <Input
                          name={`stepDelay${index}`}
                          type="number"
                          min={0}
                          defaultValue={step.delayAmount}
                          className="mt-1 h-8"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Unit
                        <select
                          name={`stepUnit${index}`}
                          defaultValue={step.delayUnit}
                          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-1 text-xs"
                        >
                          {FOLLOW_UP_DELAY_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground sm:col-span-4">
                        Message (optional)
                        <Textarea
                          name={`stepMessage${index}`}
                          defaultValue={step.message}
                          className="mt-1 min-h-16"
                        />
                      </label>
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
                            <p className="text-sm font-semibold text-navy">{template.name}</p>
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
                              {step.method} · {step.delayAmount} {step.delayUnit}
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
        </SheetContent>
      </Sheet>
    </>
  );
}
