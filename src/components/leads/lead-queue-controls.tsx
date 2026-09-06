"use client";

import { useEffect, useState, useTransition } from "react";
import {
  logLeadQueueContact,
  overrideLeadFollowUpTemplate,
  updateLeadQueueStatus,
  updateLeadTemperature,
} from "@/app/actions/lead-follow-up";
import { LEAD_QUEUE_STATUS_FILTERS, leadStatusLabel } from "@/lib/leads/queue";
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

export function LeadHeatToggle({ leadId, temperature }: { leadId: string; temperature: string | null }) {
  const current = temperature === "cold" ? "cold" : "hot";
  return (
    <form action={updateLeadTemperature} className="inline-flex rounded-md border border-border">
      <input type="hidden" name="leadId" value={leadId} />
      {(["hot", "cold"] as const).map((value) => (
        <button
          key={value}
          type="submit"
          name="temperature"
          value={value}
          className={cn(
            "h-6 px-2 text-xs font-medium capitalize",
            current === value ? "bg-secondary text-navy" : "text-muted-foreground hover:text-navy",
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
}: {
  leadId: string;
  templateId: string | null;
  templates: Array<{ id: string; name: string }>;
}) {
  const [value, setValue] = useState(templateId ?? "");
  const [pending, start] = useTransition();

  useEffect(() => {
    setValue(templateId ?? "");
  }, [templateId]);

  return (
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
          {template.name}
        </option>
      ))}
    </select>
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
