import { US_STATE_CODES } from "@/lib/org/states";

export function StatePicker({
  name = "states",
  selected,
}: {
  name?: string;
  selected: string[];
}) {
  const picked = new Set(selected);
  return (
    <fieldset>
      <legend className="text-xs text-muted-foreground">States</legend>
      <div className="mt-1 grid max-h-40 grid-cols-6 gap-1 overflow-auto rounded-md border border-border bg-card p-2 sm:grid-cols-10">
        {US_STATE_CODES.map((code) => (
          <label
            key={code}
            className="flex items-center gap-1 text-[11px] text-navy"
          >
            <input
              type="checkbox"
              name={name}
              value={code}
              defaultChecked={picked.has(code)}
              className="size-3 accent-primary"
            />
            {code}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
