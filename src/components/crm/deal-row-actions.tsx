import { createDealOutreach } from "@/app/actions/crm";
import { mailtoHref, OUTREACH_KINDS, outreachLabel, telHref } from "@/lib/crm/lists";

export function DealRowActions({
  dealId,
  phone,
  email,
}: {
  dealId: string;
  phone?: string | null;
  email?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {OUTREACH_KINDS.map((kind) => {
        const href =
          kind === "call" ? telHref(phone) : kind === "email" ? mailtoHref(email) : null;
        return (
          <form key={kind} action={createDealOutreach} className="inline">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="kind" value={kind} />
            {href ? (
              <a
                href={href}
                className="mr-0.5 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-primary hover:bg-muted"
              >
                {kind === "email" ? "Mail" : "Dial"}
              </a>
            ) : null}
            <button
              type="submit"
              className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-navy hover:bg-muted"
              title="Logs a desk task. Nothing is sent."
            >
              {outreachLabel(kind)}
            </button>
          </form>
        );
      })}
    </div>
  );
}
