import { STATUS_COLOR_KEYS, statusColorClass, type StatusColorKey } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

export function StatusColorSelect({
  name = "color",
  defaultValue = "slate",
  id,
  className,
  "aria-label": ariaLabel = "Color",
}: {
  name?: string;
  defaultValue?: string | null;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const selected = (STATUS_COLOR_KEYS as readonly string[]).includes(String(defaultValue ?? ""))
    ? (defaultValue as StatusColorKey)
    : "slate";
  return (
    <select
      id={id}
      name={name}
      defaultValue={selected}
      aria-label={ariaLabel}
      className={cn("h-8 rounded-md border border-input bg-card px-2 text-xs capitalize", className)}
      data-ff-status-color-select=""
    >
      {STATUS_COLOR_KEYS.map((key) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </select>
  );
}

export function StatusColorSwatch({ color }: { color: string | null | undefined }) {
  if (!color) return null;
  return (
    <span
      className={cn("inline-block h-3 w-3 shrink-0 rounded-full border", statusColorClass(color))}
      title={color}
      data-ff-status-color-swatch={color}
      aria-hidden
    />
  );
}
