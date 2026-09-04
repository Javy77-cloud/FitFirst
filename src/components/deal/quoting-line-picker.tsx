import { setQuotingLine } from "@/app/actions/quoting";
import { Button } from "@/components/ui/button";
import { QUOTING_FORMS } from "@/lib/domain";

export function QuotingLinePicker({
  dealId,
  currentForm,
  sourceDocCount,
}: {
  dealId: string;
  currentForm?: string | null;
  sourceDocCount: number;
}) {
  const picked = QUOTING_FORMS.find((form) => form.id === currentForm);
  return (
    <section className="rounded-md border border-primary/30 bg-card p-3">
      <h3 className="text-sm font-semibold text-navy">What are we quoting?</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {sourceDocCount > 0
          ? `${sourceDocCount} source doc${sourceDocCount === 1 ? "" : "s"} on this deal. Pick the line and policy form before the master sheet can be approved.`
          : "Drop a dec, 4-point, or wind mit, then pick the line. HO3 fills the homeowners master sheet and prepares Auto + commercial worksheets."}
      </p>
      {picked ? (
        <p className="mt-2 text-xs text-navy">
          Quoting <span className="font-semibold">{picked.label}</span>. Change it if this drop is
          a different line.
        </p>
      ) : (
        <p className="mt-2 text-xs text-fit-yellow">Required before quoting unlocks.</p>
      )}
      <form action={setQuotingLine} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="dealId" value={dealId} />
        <label className="text-xs">
          Line / policy type
          <select
            name="quotingForm"
            required
            defaultValue={currentForm ?? "HO3"}
            className="mt-1 block h-8 min-w-48 rounded-md border border-input bg-card px-2 text-sm"
          >
            {QUOTING_FORMS.map((form) => (
              <option key={form.id} value={form.id}>
                {form.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm">
          {picked ? "Update line and open sheet" : "Fill master sheet"}
        </Button>
      </form>
    </section>
  );
}
