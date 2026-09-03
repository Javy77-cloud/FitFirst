"use client";

import { useState } from "react";
import { createDealOutreach } from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OUTREACH_KINDS, outreachLabel, type OutreachKind } from "@/lib/crm/lists";

export function DealRowActions({ dealId }: { dealId: string }) {
  const [kind, setKind] = useState<OutreachKind | null>(null);

  if (!kind) {
    return (
      <div className="flex flex-wrap gap-1">
        {OUTREACH_KINDS.map((option) => (
          <Button key={option} type="button" size="xs" variant="outline" onClick={() => setKind(option)}>
            {outreachLabel(option)}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <form
      action={createDealOutreach}
      className="min-w-52 space-y-1.5 rounded-md border border-border bg-background p-2"
      onSubmit={() => setKind(null)}
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="text-[11px] font-semibold text-navy">
        {outreachLabel(kind)} — desk only, nothing is sent
      </div>
      <Input name="note" placeholder="Note" className="h-7 text-xs" />
      <Input name="dueDate" type="date" className="h-7 text-xs" />
      <div className="flex gap-1">
        <Button type="submit" size="xs">
          Log {outreachLabel(kind).toLowerCase()}
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={() => setKind(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
