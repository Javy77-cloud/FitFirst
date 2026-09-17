import {
  STATUS_COLOR_KEYS,
  liveColorKey,
  statusColorClass,
  statusColorSelectValue,
} from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

export { statusColorSelectValue };

export function StatusColorSelect({
  name = "color",
  defaultValue = null,
  id,
  form,
  className,
  disabled,
  onColorChange,
  "aria-label": ariaLabel = "Color",
}: {
  name?: string;
  defaultValue?: string | null;
  id?: string;
  form?: string;
  className?: string;
  disabled?: boolean;
  onColorChange?: (color: string | null) => void;
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
      onChange={
        onColorChange
          ? (event) => {
              const next = statusColorSelectValue(event.currentTarget.value);
              onColorChange(next || null);
            }
          : undefined
      }
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

export function StatusColorSwatch({
  color,
  showEmpty = false,
}: {
  color: string | null | undefined;
  showEmpty?: boolean;
}) {
  const key = liveColorKey(color);
  if (key === "none") {
    if (!showEmpty) return null;
    return (
      <span
        className="inline-block size-3.5 shrink-0 rounded-full border border-dashed border-[color:var(--ff-row-line)] bg-transparent"
        title="None"
        data-ff-status-color-swatch="none"
        aria-hidden
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-block size-3.5 shrink-0 rounded-full border shadow-[inset_0_0_0_1px_rgb(255_255_255/0.4)]",
        statusColorClass(key),
      )}
      title={key}
      data-ff-status-color-swatch={key}
      aria-hidden
    />
  );
}
