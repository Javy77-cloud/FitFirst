import { CARRIER_TABLE_COLUMNS, type CarrierTableColumnId } from "@/lib/carriers/desk";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ColumnPicker({
  visible,
  notesId,
}: {
  visible: Record<CarrierTableColumnId, boolean>;
  notesId?: string;
}) {
  return (
    <details className="relative">
      <summary
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        Columns
      </summary>
      <form
        method="get"
        action="/carriers"
        className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-border bg-card p-3 shadow-md"
      >
        {notesId ? <input type="hidden" name="notes" value={notesId} /> : null}
        <p className="mb-2 text-xs font-medium text-muted-foreground">Show on the table</p>
        <ul className="space-y-1.5">
          {CARRIER_TABLE_COLUMNS.map((col) => (
            <li key={col.id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="cols"
                  value={col.id}
                  defaultChecked={visible[col.id]}
                />
                {col.label}
              </label>
            </li>
          ))}
        </ul>
        <button
          type="submit"
          className={cn(buttonVariants({ size: "sm" }), "mt-3 w-full")}
        >
          Apply
        </button>
      </form>
    </details>
  );
}
