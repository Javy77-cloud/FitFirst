"use client";

import { useMemo, useState } from "react";
import {
  createRenewalCrossSellDeal,
  createRenewalCrossSellReminder,
  queueRenewalCrossSellTemplate,
} from "@/app/actions/renewals-board";
import type { CrossSellSuggestion } from "@/lib/renewal/cross-sell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EmailTemplateOption = { id: string; name: string };

export function RenewalCrossSellPanel({
  suggestions,
  policyId,
  contactId,
  accountId,
  clientName,
  email,
  templates,
}: {
  suggestions: CrossSellSuggestion[];
  policyId: string;
  contactId: string | null;
  accountId: string | null;
  clientName: string;
  email: string | null;
  templates: EmailTemplateOption[];
}) {
  const [open, setOpen] = useState<CrossSellSuggestion | null>(null);
  const first = suggestions[0] ?? null;
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  if (!first) {
    return (
      <p className="mt-2 rounded border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground">
        No cross-sell gap on this household&apos;s personal lines.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-1" data-ff-renewal-cross-sell="">
      <button
        type="button"
        onClick={() => setOpen(first)}
        className="w-full rounded border border-border bg-fit-flag-bg px-2 py-1.5 text-left text-[11px] text-navy hover:border-primary"
      >
        <span className="font-semibold">Cross-sell</span>
        <span className="mt-0.5 block text-muted-foreground">{first.copy}</span>
        {suggestions.length > 1 ? (
          <span className="mt-0.5 block text-muted-foreground">
            +{suggestions.length - 1} more
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Cross-sell actions"
          onClick={() => setOpen(null)}
        >
          <div
            className="ff-card max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-navy">Cross-sell · {open.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{open.copy}</p>
              </div>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setOpen(null)}
              >
                Close
              </button>
            </div>

            <section className="space-y-2 rounded-md border border-border p-3">
              <h4 className="text-sm font-semibold text-navy">a) Set a reminder</h4>

              <form action={createRenewalCrossSellReminder} className="space-y-2">
                <input type="hidden" name="policyId" value={policyId} />
                <input type="hidden" name="contactId" value={contactId ?? ""} />
                <input type="hidden" name="accountId" value={accountId ?? ""} />
                <input type="hidden" name="line" value={open.label} />
                <div>
                  <Label htmlFor={`due-${open.line}`} className="text-xs">
                    Reminder date
                  </Label>
                  <Input
                    id={`due-${open.line}`}
                    name="dueAt"
                    type="date"
                    required
                    defaultValue={tomorrow}
                    className="mt-1 h-8"
                  />
                </div>
                <Button type="submit" size="sm">
                  Save reminder task
                </Button>
              </form>
            </section>

            <section className="space-y-2 rounded-md border border-border p-3">
              <h4 className="text-sm font-semibold text-navy">b) Send a template</h4>

              {templates.length === 0 ? null : (
                <form action={queueRenewalCrossSellTemplate} className="space-y-2">
                  <input type="hidden" name="policyId" value={policyId} />
                  <input type="hidden" name="contactId" value={contactId ?? ""} />
                  <input type="hidden" name="accountId" value={accountId ?? ""} />
                  <input type="hidden" name="email" value={email ?? ""} />
                  <div>
                    <Label htmlFor={`tpl-${open.line}`} className="text-xs">
                      Email template
                    </Label>
                    <select
                      id={`tpl-${open.line}`}
                      name="templateId"
                      required
                      defaultValue=""
                      className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                    >
                      <option value="">None</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`sched-${open.line}`} className="text-xs">
                      Schedule
                    </Label>
                    <select
                      id={`sched-${open.line}`}
                      name="schedule"
                      defaultValue="tomorrow"
                      className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                    >
                      <option value="tomorrow">Tomorrow</option>
                      <option value="custom">Custom date</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`custom-${open.line}`} className="text-xs">
                      Custom date
                    </Label>
                    <Input
                      id={`custom-${open.line}`}
                      name="customDate"
                      type="date"
                      defaultValue={tomorrow}
                      className="mt-1 h-8"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="outline">
                    Queue template (stub send)
                  </Button>
                </form>
              )}
            </section>

            <section className="space-y-2 rounded-md border border-border p-3">
              <h4 className="text-sm font-semibold text-navy">c) Create a quote</h4>

              <form action={createRenewalCrossSellDeal}>
                <input type="hidden" name="contactId" value={contactId ?? ""} />
                <input type="hidden" name="accountId" value={accountId ?? ""} />
                <input type="hidden" name="clientName" value={clientName} />
                <input type="hidden" name="line" value={open.line} />
                <Button type="submit" size="sm" disabled={!contactId && !accountId}>
                  Create {open.label} deal
                </Button>
              </form>
              {!contactId && !accountId ? null : null}
            </section>

            {suggestions.length > 1 ? (
              <div className="flex flex-wrap gap-1">
                {suggestions.map((item) => (
                  <button
                    key={item.line}
                    type="button"
                    onClick={() => setOpen(item)}
                    className={
                      open.line === item.line
                        ? "rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground"
                        : "rounded border border-border px-2 py-0.5 text-[11px] text-navy"
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
