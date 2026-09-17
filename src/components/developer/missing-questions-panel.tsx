import {
  createMissingQuestionAction,
  setMissingQuestionStatusAction,
  updateMissingQuestionAction,
} from "@/app/actions/carrier-gaps";
import { Button } from "@/components/ui/button";
import type { CarrierMissingQuestion } from "@/lib/db/schema";
import {
  GAP_PRODUCT_LINES,
  GAP_STATUSES,
  GAP_STATUS_LABEL,
  GAP_SURFACE_LABEL,
  GAP_SURFACES,
  type GapStatus,
} from "@/lib/carrier-gaps/types";

const fieldClass =
  "mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-navy";

function formatWhen(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProductLineSelect({
  name,
  defaultValue,
  required,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} required={required} className={fieldClass}>
      <option value="">Product line</option>
      {defaultValue && !GAP_PRODUCT_LINES.some((row) => row.label === defaultValue) ? (
        <option value={defaultValue}>{defaultValue}</option>
      ) : null}
      {GAP_PRODUCT_LINES.map((row) => (
        <option key={row.id} value={row.label}>
          {row.label}
        </option>
      ))}
    </select>
  );
}

export function MissingQuestionsPanel({
  rows,
  returnTo,
}: {
  rows: CarrierMissingQuestion[];
  returnTo: string;
}) {
  return (
    <div className="space-y-4" data-ff-missing-questions="">
      <form
        action={createMissingQuestionAction}
        className="ff-card space-y-3 p-4"
        data-ff-missing-question-create=""
      >
        <input type="hidden" name="next" value={returnTo} />
        <h2 className="text-sm font-semibold text-navy">Log a missing question</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Product line
            <ProductLineSelect name="productLine" required />
          </label>
          <label className="text-xs text-muted-foreground">
            Carrier <span className="font-normal">(optional)</span>
            <input
              name="carrier"
              maxLength={120}
              placeholder="Only if a specific carrier asked"
              className={fieldClass}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Suggested surface
            <select name="suggestedSurface" defaultValue="risk_profile" className={fieldClass}>
              {GAP_SURFACES.map((surface) => (
                <option key={surface} value={surface}>
                  {GAP_SURFACE_LABEL[surface]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs text-muted-foreground">
          Note
          <textarea
            name="note"
            required
            maxLength={2000}
            rows={3}
            placeholder="What the carrier or quote bot asked for that FitFirst has no field for"
            className="mt-0.5 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-navy"
          />
        </label>
        <Button type="submit" size="sm">
          Add to list
        </Button>
      </form>

      {rows.length === 0 ? (
        <p
          className="ff-card px-4 py-6 text-sm text-muted-foreground"
          data-ff-missing-questions-empty=""
        >
          Nothing logged yet. When a carrier or quote bot asks for data FitFirst has no field for,
          add it here once. Mark Added after the field ships on Deal Details or Risk Profile. This
          list stays empty on purpose — no example carrier noise.
        </p>
      ) : (
        <div className="space-y-3" data-ff-missing-questions-list="">
          {rows.map((row) => {
            const status = (GAP_STATUSES.includes(row.status as GapStatus)
              ? row.status
              : "open") as GapStatus;
            return (
              <section
                key={row.id}
                className="ff-card space-y-3 p-4"
                data-ff-missing-question={row.id}
                data-ff-missing-question-status={status}
              >
                <form action={updateMissingQuestionAction} className="space-y-3">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="next" value={returnTo} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        status === "open"
                          ? "bg-fit-yellow-bg text-fit-yellow"
                          : "bg-[var(--ff-green-bg)] text-[var(--ff-green)]"
                      }`}
                    >
                      {GAP_STATUS_LABEL[status]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatWhen(row.createdAt)}
                      {row.createdBy ? ` · ${row.createdBy}` : ""}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-muted-foreground">
                      Product line
                      <ProductLineSelect name="productLine" defaultValue={row.productLine} required />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Carrier
                      <input
                        name="carrier"
                        maxLength={120}
                        defaultValue={row.carrier ?? ""}
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Suggested surface
                      <select
                        name="suggestedSurface"
                        defaultValue={
                          row.suggestedSurface === "details" ? "details" : "risk_profile"
                        }
                        className={fieldClass}
                      >
                        {GAP_SURFACES.map((surface) => (
                          <option key={surface} value={surface}>
                            {GAP_SURFACE_LABEL[surface]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Status
                      <select name="status" defaultValue={status} className={fieldClass}>
                        {GAP_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {GAP_STATUS_LABEL[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block text-xs text-muted-foreground">
                    Note
                    <textarea
                      name="note"
                      required
                      maxLength={2000}
                      rows={3}
                      defaultValue={row.note}
                      className="mt-0.5 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-navy"
                    />
                  </label>
                  <Button type="submit" size="sm" variant="outline">
                    Save
                  </Button>
                </form>
                <form action={setMissingQuestionStatusAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="next" value={returnTo} />
                  <input
                    type="hidden"
                    name="status"
                    value={status === "open" ? "added" : "open"}
                  />
                  <Button type="submit" size="xs" variant={status === "open" ? "default" : "outline"}>
                    {status === "open" ? "Mark added" : "Reopen"}
                  </Button>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
