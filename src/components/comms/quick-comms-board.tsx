"use client";

import { useState } from "react";
import { completeDeskActivity, logDeskActivity } from "@/app/actions/activities-desk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_KIND_LABEL, ACTIVITY_KINDS, formatDay, type ActivityKind } from "@/lib/domain";
import type { SerializedActivity } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

const KIND_TONE: Record<ActivityKind, string> = {
  task: "bg-[#dbeafe] text-[#1d4e89]",
  meeting: "bg-[#fff4d1] text-[#8a6500]",
  call: "bg-[#e4f5ec] text-[#1f7a4d]",
  email: "bg-[#e0f2fe] text-[#0369a1]",
  sms: "bg-[#ffedd5] text-[#c2410c]",
};

export function QuickCommsBoard({
  items,
  dealId,
  leadId,
}: {
  items: SerializedActivity[];
  dealId?: string | null;
  leadId?: string | null;
}) {
  const [kind, setKind] = useState<ActivityKind>("task");
  const filtered = items.filter((item) => item.kind === kind);

  return (
    <section className="ff-card min-w-0 w-full max-w-full overflow-x-hidden p-4">
      <h2 className="text-base font-semibold text-navy">Quick Communications</h2>
      <p className="mt-1 text-base text-muted-foreground">
        Task, meeting, call, email, and SMS on this {dealId ? "deal" : "lead"}. Not a carrier
        portal and not a live mail trunk.
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {ACTIVITY_KINDS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={cn(
              "h-8 rounded-md px-2.5 text-xs font-medium",
              kind === value ? KIND_TONE[value] : "border border-border bg-card text-muted-foreground",
            )}
          >
            {ACTIVITY_KIND_LABEL[value]}
          </button>
        ))}
      </div>

      <form action={logDeskActivity} className="my-3 grid min-w-0 max-w-full gap-2 rounded-md border border-border p-3">
        {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        <input type="hidden" name="kind" value={kind} />
        <div className="min-w-0">
          <Label className="text-xs">Title</Label>
          <Input
            name="title"
            required
            className="mt-1 h-8 min-w-0 w-full max-w-full"
            placeholder={`${ACTIVITY_KIND_LABEL[kind]} · follow-up`}
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs">When</Label>
          <Input name="dueAt" type="datetime-local" className="mt-1 h-8 min-w-0 w-full max-w-full" />
        </div>
        <div className="min-w-0">
          <Label className="text-xs">Notes</Label>
          <Input name="notes" className="mt-1 h-8 min-w-0 w-full max-w-full" />
        </div>
        <Button type="submit" size="sm">
          Add {ACTIVITY_KIND_LABEL[kind].toLowerCase()}
        </Button>
      </form>

      {filtered.length === 0 ? (
        <p className="text-base text-muted-foreground">
          No {ACTIVITY_KIND_LABEL[kind].toLowerCase()}s on this record yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {filtered.map((item) => (
            <li key={item.id} className="min-w-0 max-w-full break-words rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase", KIND_TONE[item.kind as ActivityKind] ?? "bg-muted")}>
                  {item.kind}
                </span>
                <span className="text-[11px] uppercase text-muted-foreground">{item.status}</span>
                {item.dueAt ? (
                  <span className="text-base text-muted-foreground">{formatDay(item.dueAt)}</span>
                ) : null}
              </div>
              <p className="mt-1 font-medium">{item.title}</p>
              {item.notes ? <p className="text-base text-muted-foreground">{item.notes}</p> : null}
              {item.status === "open" ? (
                <form action={completeDeskActivity} className="mt-1">
                  <input type="hidden" name="activityId" value={item.id} />
                  <Button type="submit" size="xs" variant="ghost">
                    Complete
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
