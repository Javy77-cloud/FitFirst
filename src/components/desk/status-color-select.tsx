import { STATUS_COLOR_KEYS, statusColorClass, statusColorSelectValue } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

export { statusColorSelectValue };

export function StatusColorSelect({
  name = "color",
  defaultValue = null,
  id,
  form,
  className,
  disabled,
  "aria-label": ariaLabel = "Color",
}: {
  name?: string;
  defaultValue?: string | null;
  id?: string;
  form?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const selected = statusColorSelectValue(defaultValue);
  return (
    <select
      id={id}
      form={form}
      name={name}
      defaultValue={selected}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn("h-8 rounded-md border border-input bg-card px-2 text-xs capitalize", className)}
      data-ff-status-color-select=""
    >
      <option value="">None</option>
      {STATUS_COLOR_KEYS.map((key) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </select>
  );
}

export function StatusColorSwatch({ color }: { color: string | null | undefined }) {
  if (!color || color === "none") return null;
  if (!(STATUS_COLOR_KEYS as readonly string[]).includes(String(color))) return null;
  return (
    <span
      className={cn("inline-block h-3 w-3 shrink-0 rounded-full border", statusColorClass(color))}
      title={color}
      data-ff-status-color-swatch={color}
      aria-hidden
    />
  );
}
