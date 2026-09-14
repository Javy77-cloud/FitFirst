import { Label } from "@/components/ui/label";
import { RECORD_SOURCE_GROUPS, isKnownSource, sourceLabel } from "@/lib/crm/sources";

export function SourceSelect({
  name = "source",
  id = "source",
  defaultValue,
  label = "Source",
  allowEmpty = true,
  emptyLabel = "None",
}: {
  name?: string;
  id?: string;
  defaultValue?: string | null;
  label?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const current = (defaultValue ?? "").trim();
  const selected = current || (allowEmpty ? "" : "manual");
  const extra = current && !isKnownSource(current) ? current : null;

  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <select
        id={id}
        name={name}
        defaultValue={selected}
        className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {RECORD_SOURCE_GROUPS.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {group.options.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </optgroup>
        ))}
        {extra ? <option value={extra}>{sourceLabel(extra)}</option> : null}
      </select>
    </div>
  );
}
