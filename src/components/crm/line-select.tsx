import { LINES } from "@/lib/domain";
import { LINE_LABELS } from "@/lib/crm/bind";

export function LineSelect({
  name = "line",
  id = "line",
  defaultValue = "HO",
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
    >
      {LINES.map((line) => (
        <option key={line} value={line}>
          {LINE_LABELS[line]}
        </option>
      ))}
    </select>
  );
}
