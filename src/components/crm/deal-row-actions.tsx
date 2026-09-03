import { createDealOutreach } from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OUTREACH_KINDS, outreachLabel } from "@/lib/crm/lists";

export function DealRowActions({ dealId }: { dealId: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {OUTREACH_KINDS.map((kind) => (
        <details key={kind} className="relative">
          <summary className="cursor-pointer list-none rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-navy hover:bg-muted">
            {outreachLabel(kind)}
          </summary>
          <form
            action={createDealOutreach}
            className="absolute left-0 z-30 mt-1 w-56 space-y-1.5 rounded-md border border-border bg-card p-2 shadow-md"
          >
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="kind" value={kind} />
            <div className="text-[11px] font-semibold text-navy">
              {outreachLabel(kind)} — desk only, nothing is sent
            </div>
            <Input name="note" placeholder="Note" className="h-7 text-xs" />
            <Input name="dueDate" type="date" className="h-7 text-xs" />
            <Button type="submit" size="xs">
              Log {outreachLabel(kind).toLowerCase()}
            </Button>
          </form>
        </details>
      ))}
    </div>
  );
}
