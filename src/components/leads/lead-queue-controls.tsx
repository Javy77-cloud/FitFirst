"use client";

import { useEffect, useState, useTransition } from "react";
import {
  logLeadQueueContact,
  overrideLeadFollowUpTemplate,
  scheduleLeadNurture,
  updateLeadQueueStatus,
  updateLeadTemperature,
} from "@/app/actions/lead-follow-up";
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
import {
  FOLLOW_UP_OVERRIDE_OPTIONS,
  REMIND_VIA_CHANNELS,
  REMIND_VIA_LABELS,
} from "@/lib/leads/follow-up-templates";
import {
  LEAD_QUEUE_STATUS_FILTERS,
  LEAD_TEMPERATURES,
  NURTURE_DELAY_UNITS,
  leadStatusLabel,
  normalizeLeadTemperature,
  type LeadTemperature,
} from "@/lib/leads/queue";
import { cn } from "@/lib/utils";

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [nurtureOpen, setNurtureOpen] = useState(false);

  useEffect(() => {
    setValue(status);
  }, [status]);

  function commitStatus(next: string) {
    setValue(next);
    const form = new FormData();
    form.set("leadId", leadId);
    form.set("status", next);
    start(() => {
      void updateLeadQueueStatus(form);
    });
  }

  return (
    <>
      <select
        name="status"
        value={value}
        disabled={pending}
        aria-label="Lead status"
        onChange={(event) => {
          const next = event.target.value;
          if (next === "nurture") {
            setValue("nurture");
            setNurtureOpen(true);
            return;
          }
          commitStatus(next);
        }}
        className="h-7 max-w-[8.5rem] rounded-md border border-border bg-card px-1.5 text-xs text-navy"
      >
        {LEAD_QUEUE_STATUS_FILTERS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {!LEAD_QUEUE_STATUS_FILTERS.some((option) => option.value === value) ? (
          <option value={value}>{leadStatusLabel(value)}</option>
        ) : null}
      </select>
      <NurtureLeadDialog
        leadId={leadId}
        open={nurtureOpen}
        onOpenChange={(open) => {
          setNurtureOpen(open);
          if (!open && status !== "nurture") setValue(status);
        }}
      />
    </>
  );
}

function NurtureLeadDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100%-2rem,420px)] max-w-[420px] gap-3 p-5 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Nurture</DialogTitle>
          <DialogDescription>
            Park this lead and remind yourself when to contact again. Lost stays searchable; this
            one resurfaces on the date you pick.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            start(async () => {
              await scheduleLeadNurture(formData);
              onOpenChange(false);
            });
          }}
          className="space-y-3"
        >
          <input type="hidden" name="leadId" value={leadId} />
          <div>
            <Label className="text-xs">When to contact again</Label>
            <div className="mt-1 grid grid-cols-[5.5rem_1fr] gap-2">
              <Input
                name="nurtureAmount"
                type="number"
                min={1}
                max={365}
                defaultValue="30"
                required
                aria-label="Contact again in"
                className="h-8"
              />
              <select
                name="nurtureUnit"
                defaultValue="days"
                aria-label="Contact again unit"
                className="h-8 rounded-md border border-border bg-background px-2 text-sm"
              >
                {NURTURE_DELAY_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Days or months, up to 1 year.</p>
          </div>
          <div>
            <Label htmlFor={`nurture-remind-${leadId}`} className="text-xs">
              How to remind
            </Label>
            <select
              id={`nurture-remind-${leadId}`}
              name="remindVia"
              defaultValue="task"
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              {REMIND_VIA_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {REMIND_VIA_LABELS[channel]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save nurture"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const TEMP_STYLES: Record<LeadTemperature, { selected: string; idle: string }> = {
  hot: {
    selected: "bg-fit-red-bg text-fit-red",
    idle: "text-muted-foreground hover:text-navy",
  },
  warm: {
    selected: "bg-fit-yellow-bg text-fit-yellow",
    idle: "text-muted-foreground hover:text-navy",
  },
  cold: {
    selected: "bg-fit-check-bg text-fit-check",
    idle: "text-muted-foreground hover:text-navy",
  },
};

export function LeadHeatToggle({ leadId, temperature }: { leadId: string; temperature: string | null }) {
  const current = normalizeLeadTemperature(temperature);
  return (
    <form action={updateLeadTemperature} className="inline-flex rounded-md border border-border">
      <input type="hidden" name="leadId" value={leadId} />
      {LEAD_TEMPERATURES.map((value) => (
        <button
          key={value}
          type="submit"
          name="temperature"
          value={value}
          className={cn(
            "h-6 px-2 text-xs font-medium capitalize",
            current === value ? TEMP_STYLES[value].selected : TEMP_STYLES[value].idle,
          )}
        >
          {value}
        </button>
      ))}
    </form>
  );
}

export function LeadTemplateOverride({
  leadId,
  templateId,
  templates,
  resolvedName,
}: {
  leadId: string;
  templateId: string | null;
  templates: Array<{ id: string; name: string; triggerStatus: string }>;
  resolvedName: string;
}) {
  const [value, setValue] = useState(templateId ?? "");
  const [pending, start] = useTransition();

  useEffect(() => {
    setValue(templateId ?? "");
  }, [templateId]);

  const overrides = FOLLOW_UP_OVERRIDE_OPTIONS.map((option) => {
    const template = templates.find((row) => row.triggerStatus === option.triggerStatus);
    return { ...option, templateId: template?.id ?? "" };
  });

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-navy" data-testid="lead-template-name">
        {resolvedName}
      </p>
      <select
        name="templateId"
        value={value}
        disabled={pending}
        aria-label="Follow-up template override"
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          const form = new FormData();
          form.set("leadId", leadId);
          form.set("templateId", next);
          start(() => {
            void overrideLeadFollowUpTemplate(form);
          });
        }}
        className="h-7 max-w-[10rem] rounded-md border border-border bg-card px-1.5 text-xs text-navy"
      >
        {overrides.map((option) => (
          <option key={option.triggerStatus} value={option.templateId} disabled={!option.templateId}>
            {option.label}
          </option>
        ))}
        <option value="">Default</option>
      </select>
    </div>
  );
}

export function LeadLogContact({ leadId }: { leadId: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(["call", "text", "email"] as const).map((method) => (
        <form key={method} action={logLeadQueueContact}>
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="method" value={method} />
          <button
            type="submit"
            className="text-xs text-primary hover:underline"
            title={
              method === "call"
                ? "Log a call. In-app only — no trunk."
                : "Log contact. Client send is a stub until a paid API is wired."
            }
          >
            {method}
          </button>
        </form>
      ))}
    </div>
  );
}
