"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

function optionDomId(fieldKey: string, option: string) {
  const slug = option
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `ff-ms-${fieldKey}-${slug || "opt"}`;
}

function parseSelected(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Dropdown multi-select. Optional type-to-filter for long option lists. */
export function MultiSelectField({
  name,
  options,
  value,
  disabled,
  form,
  searchable = false,
  label,
  fieldKey,
  onChange,
}: {
  name: string;
  options: string[];
  value: string;
  disabled?: boolean;
  form?: string;
  searchable?: boolean;
  label: string;
  fieldKey: string;
  /** Joined comma value whenever selection changes. */
  onChange?: (joined: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => parseSelected(value));
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Only sync from the saved prop — never wipe local picks when the menu closes.
  useEffect(() => {
    setSelected(parseSelected(value));
  }, [value]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuBox(null);
      return;
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, 240);
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      const estimated = searchable ? 280 : 240;
      const below = rect.bottom + 4;
      const top =
        below + estimated > window.innerHeight - 8
          ? Math.max(8, rect.top - estimated - 4)
          : below;
      setMenuBox({ top, left: Math.max(8, left), width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    // Bubble phase so option clicks inside the menu run first.
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  const emit = (next: string[]) => {
    onChange?.(next.join(","));
  };

  const toggle = (option: string) => {
    setSelected((prev) => {
      const next = prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option];
      emit(next);
      return next;
    });
  };

  const remove = (option: string) => {
    setSelected((prev) => {
      const next = prev.filter((item) => item !== option);
      emit(next);
      return next;
    });
  };

  const menu =
    open && !disabled && menuBox && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            className="fixed z-[300] max-h-64 overflow-hidden rounded-md border border-border bg-white shadow-lg"
            style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
            data-ff-multi-menu={fieldKey}
          >
            {searchable ? (
              <div className="border-b border-border p-1.5">
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type to filter…"
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                  data-ff-multi-filter=""
                />
              </div>
            ) : null}
            <ul className="max-h-52 overflow-y-auto p-1">
              {options.length === 0 ? (
                <li className="px-2 py-1.5 text-xs text-muted-foreground">No options yet.</li>
              ) : filtered.length === 0 ? (
                <li className="px-2 py-1.5 text-xs text-muted-foreground">No matches</li>
              ) : (
                filtered.map((option) => {
                  const on = selected.includes(option);
                  const id = optionDomId(fieldKey, option);
                  return (
                    <li key={option}>
                      <label
                        htmlFor={id}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                          on && "bg-muted/70",
                        )}
                      >
                        <input
                          id={id}
                          type="checkbox"
                          className="size-3.5 shrink-0 accent-[#002868]"
                          checked={on}
                          disabled={disabled}
                          onChange={() => toggle(option)}
                          data-ff-multi-option={option}
                        />
                        <span className="min-w-0 flex-1 truncate">{option}</span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className="relative mt-1"
      data-ff-multi-select={fieldKey}
      data-ff-multi-searchable={searchable ? "1" : "0"}
      data-ff-multi-option-count={options.length}
      data-ff-multi-count={selected.length}
    >
      {/* Form-linked values — RecordLayoutFields uses the form= attribute. */}
      {selected.map((option) => (
        <input
          key={`hidden:${option}`}
          type="hidden"
          name={name}
          value={option}
          form={form}
        />
      ))}
      {/* div trigger (not <button>) so Contact field text-sm / #002868 matches other layout inputs */}
      <div
        ref={triggerRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        id={`field_${fieldKey}`}
        aria-disabled={disabled || undefined}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-ff-no-hover=""
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        className={cn(
          // Match Contact layout picklist/input: text-sm + Old Glory #002868
          "mt-1 flex min-h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1 text-left text-sm text-[#002868]",
          disabled && "cursor-not-allowed opacity-50",
        )}
        style={{ color: "#002868", fontSize: "0.9375rem", fontFamily: "inherit", fontWeight: 400 }}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selected.length === 0 ? (
            <span className="text-sm" style={{ color: "#6b7280", fontFamily: "inherit", fontWeight: 400 }}>
              None
            </span>
          ) : (
            selected.map((option) => (
              <span
                key={option}
                className="inline-flex max-w-full items-center gap-1 rounded-sm border border-border bg-muted/50 px-1.5 py-0.5 text-sm"
                style={{ color: "#002868", fontSize: "0.9375rem", fontFamily: "inherit", fontWeight: 400 }}
              >
                <span className="truncate" style={{ color: "#002868" }}>
                  {option}
                </span>
                {!disabled ? (
                  <span
                    role="button"
                    tabIndex={-1}
                    className="shrink-0"
                    style={{ color: "#002868" }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      remove(option);
                    }}
                  >
                    <X className="size-3.5" aria-hidden style={{ color: "#002868" }} />
                  </span>
                ) : null}
              </span>
            ))
          )}
        </span>
        <ChevronDown className="size-3.5 shrink-0" aria-hidden style={{ color: "#6b7280" }} />
      </div>
      {menu}
    </div>
  );
}
