"use client";

import { useEffect, useState, useTransition } from "react";
import {
  logLeadQueueContact,
  overrideLeadFollowUpTemplate,
  updateLeadQueueStatus,
  updateLeadTemperature,
} from "@/app/actions/lead-follow-up";
import { followUpTemplateChipName } from "@/lib/leads/follow-up-templates";
import {
  LEAD_QUEUE_STATUS_FILTERS,
  LEAD_TEMPERATURES,
  leadStatusLabel,
  normalizeLeadTemperature,
  type LeadTemperature,
} from "@/lib/leads/queue";
import { cn } from "@/lib/utils";

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();

  useEffect(() => {
    setValue(status);
  }, [status]);

  return (
    <select
      name="status"
      value={value}
      disabled={pending}
      aria-label="Lead status"
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        const form = new FormData();
        form.set("leadId", leadId);
        form.set("status", next);
        start(() => {
          void updateLeadQueueStatus(form);
        });
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
        <option value="">Automatic</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {followUpTemplateChipName(template)}
          </option>
        ))}
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
