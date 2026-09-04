import { LINES } from "@/lib/domain";
import { LINE_LABELS } from "@/lib/crm/bind";
import { visibleLines, type DeskLineSettings } from "@/lib/desk/line-settings";

export function LineSelect({
  name = "line",
  id = "line",
  defaultValue = "HO",
  settings,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  settings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
}) {
  const lines = settings ? visibleLines(LINES, settings) : [...LINES];
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
    >
      {lines.map((line) => (
        <option key={line} value={line}>
          {LINE_LABELS[line]}
        </option>
      ))}
    </select>
  );
}
