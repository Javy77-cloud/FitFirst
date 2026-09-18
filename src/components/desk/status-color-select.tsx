"use client";

import { useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => statusColorSelectValue(defaultValue));
  const inputRef = useRef<HTMLInputElement>(null);
  const token = liveColorKey(selected);

  function apply(raw: string) {
    const next = statusColorSelectValue(raw);
    setSelected(next);
    if (inputRef.current) inputRef.current.value = next;
    onColorChange?.(next || null);
    setOpen(false);
  }

  return (
    <span className="inline-flex shrink-0 items-center" data-ff-status-color-picker="">
      <input
        id={id}
        ref={inputRef}
        type="hidden"
        form={form}
        name={name}
        defaultValue={selected}
        disabled={disabled}
        data-ff-status-color-select=""
      />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          data-ff-status-color-palette-trigger=""
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-input bg-card px-2 text-xs capitalize",
            token !== "none" && statusColorClass(token),
            className,
          )}
        >
          <StatusColorSwatch color={selected || null} showEmpty />
          {selected || "Color"}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={4}
          className="w-56 p-2"
          data-ff-status-color-palette=""
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>Full color palette</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => apply("")}
            data-ff-status-color-palette-none=""
          >
            None
          </DropdownMenuItem>
          <div className="grid grid-cols-5 gap-1 p-1" role="listbox" aria-label="Full color palette">
            {STATUS_COLOR_KEYS.map((key) => (
              <DropdownMenuItem
                key={key}
                onClick={() => apply(key)}
                aria-label={key}
                title={key}
                data-ff-status-color-palette-key={key}
                className="size-8 min-w-8 justify-center p-0"
              >
                <span
                  className={cn(
                    "inline-block size-5 rounded-full border shadow-[inset_0_0_0_1px_rgb(255_255_255/0.4)]",
                    statusColorClass(key),
                    selected === key && "ring-2 ring-navy ring-offset-1",
                  )}
                />
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
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
