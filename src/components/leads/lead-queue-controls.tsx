"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  overrideLeadFollowUpTemplate,
  scheduleLeadNurture,
  updateLeadQueueStatus,
  updateLeadTemperature,
} from "@/app/actions/lead-follow-up";
import { publishLeadClock, subscribeLeadClock } from "@/lib/leads/clock-sync";
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
import { ContactActionButtons } from "@/components/desk/contact-action-buttons";
import {
  DEFAULT_FOLLOW_UP_TRIGGER,
  FOLLOW_UP_OVERRIDE_OPTIONS,
  isDefaultFollowUpTemplate,
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
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [nurtureOpen, setNurtureOpen] = useState(false);

  useEffect(() => {
    setValue(status);
  }, [leadId, status]);

  function commitStatus(next: string) {
    setValue(next);
    const form = new FormData();
    form.set("leadId", leadId);
    form.set("status", next);
    start(async () => {
      const result = await updateLeadQueueStatus(form);
      if (leadId) {
        publishLeadClock({
          leadId,
          dueAt: result?.dueAt ?? null,
          followUpName: result?.followUpName ?? "",
        });
      }
      router.refresh();
    });
  }

  return (
    <>
      <select
        name={`status-${leadId}`}
        value={value}
        disabled={pending}
        aria-label="Lead status"
        data-lead-id={leadId}
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
  resolvedTemplateId,
}: {
  leadId: string;
  templateId?: string | null;
  templates?: Array<{ id: string; name: string; triggerStatus: string }> | null;
  resolvedName?: string | null;
  resolvedTemplateId?: string | null;
}) {
  const router = useRouter();
  const list = Array.isArray(templates) ? templates.filter((row) => row?.id) : [];
  const [value, setValue] = useState(templateId ?? "");
  const [name, setName] = useState(resolvedName || "—");
  const [pending, start] = useTransition();

  useEffect(() => {
    setValue(templateId ?? "");
  }, [leadId, templateId]);

  useEffect(() => {
    setName(resolvedName || "—");
  }, [leadId, resolvedName]);

  useEffect(() => {
    return subscribeLeadClock((patch) => {
      if (!patch || patch.leadId !== leadId) return;
      if (patch.followUpName != null) setName(patch.followUpName || "—");
    });
  }, [leadId]);

  const defaultTemplate = list.find((row) => isDefaultFollowUpTemplate(row));
  const overrides = FOLLOW_UP_OVERRIDE_OPTIONS.map((option) => {
    const template =
      option.triggerStatus === DEFAULT_FOLLOW_UP_TRIGGER
        ? defaultTemplate
        : list.find((row) => row.triggerStatus === option.triggerStatus);
    return { ...option, templateId: template?.id ?? "" };
  });
  const defaultId = defaultTemplate?.id ?? "";
  const selected = value || resolvedTemplateId || defaultId;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-navy" data-testid="lead-template-name">
        {name}
      </p>
      <select
        name={`templateId-${leadId}`}
        value={selected}
        disabled={pending}
        aria-label="Follow-up template override"
        data-lead-id={leadId}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          const form = new FormData();
          form.set("leadId", leadId);
          form.set("templateId", next);
          start(async () => {
            const result = await overrideLeadFollowUpTemplate(form);
            if (leadId) {
              publishLeadClock({
                leadId,
                dueAt: result?.dueAt ?? null,
                followUpName: result?.followUpName ?? "",
              });
            }
            router.refresh();
          });
        }}
        className="h-7 max-w-[11.5rem] rounded-md border border-border bg-card px-1.5 text-xs text-navy"
      >
        {overrides.map((option) => (
          <option key={option.triggerStatus} value={option.templateId} disabled={!option.templateId}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function LeadLogContact({
  leadId,
  phone,
  email,
}: {
  leadId: string;
  phone?: string | null;
  email?: string | null;
}) {
  return <ContactActionButtons leadId={leadId} phone={phone} email={email} />;
}
