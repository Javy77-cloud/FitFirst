import { LINES } from "@/lib/domain";
import { LINE_LABELS } from "@/lib/crm/bind";
import { visibleLines, type DeskLineSettings } from "@/lib/desk/line-settings";
import { withNoneOption } from "@/lib/ui/select-options";

export function LineSelect({
  name = "line",
  id = "line",
  defaultValue = "",
  settings,
  required,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  settings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
  required?: boolean;
}) {
  const lines = settings ? visibleLines(LINES, settings) : [...LINES];
  const options = withNoneOption(
    lines.map((line) => ({ value: line, label: LINE_LABELS[line] })),
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
