import { LINES } from "@/lib/domain";
import { LINE_LABELS } from "@/lib/crm/bind";
import { visibleLines, type DeskLineSettings } from "@/lib/desk/line-settings";
import { withNoneOption } from "@/lib/ui/select-options";

export type LineSelectOption = { value: string; label: string };

export function LineSelect({
  name = "line",
  id = "line",
  defaultValue = "",
  settings,
  required,
  lines,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  settings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  required?: boolean;
  /** Agency master list. Falls back to seeded `LINES` when omitted. */
  lines?: readonly LineSelectOption[];
}) {
  const fallback = (settings ? visibleLines(LINES, settings) : [...LINES]).map((line) => ({
    value: line,
    label: LINE_LABELS[line] ?? line,
  }));
  const source = lines && lines.length > 0 ? [...lines] : fallback;
  const hasCurrent = !defaultValue || source.some((row) => row.value === defaultValue);
  const options = withNoneOption(
    hasCurrent ? source : [{ value: defaultValue, label: `${defaultValue} · not on list` }, ...source],
  );
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      required={required}
      className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
    >
      {options.map((row) => (
        <option key={row.value || "__none"} value={row.value}>
          {row.label}
        </option>
      ))}
    </select>
  );
}
