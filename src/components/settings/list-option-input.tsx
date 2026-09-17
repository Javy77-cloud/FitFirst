"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { Input } from "@/components/ui/input";
import { listOptionNeedsCommit } from "@/lib/settings/list-editor";

type ListOptionInputProps = Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange"> & {
  /** Last committed / saved label. Local draft stays isolated while typing. */
  committedValue: string;
  /** Parent or persist hook — blur only, never each keystroke. */
  onCommit?: (next: string) => void;
};

/**
 * Settings list / picklist / layout option name field.
 * Types into local state so a parent re-render or server action cannot remount
 * the input mid-keystroke. Commits on blur (Save still reads the live DOM value).
 */
export function ListOptionInput({
  committedValue,
  onCommit,
  onFocus,
  onBlur,
  ...props
}: ListOptionInputProps) {
  const [draft, setDraft] = useState(committedValue);
  const draftRef = useRef(committedValue);
  const committedRef = useRef(committedValue);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return;
    if (committedValue === committedRef.current && committedValue === draftRef.current) return;
    committedRef.current = committedValue;
    draftRef.current = committedValue;
    setDraft(committedValue);
  }, [committedValue]);

  function commit(next: string) {
    if (!listOptionNeedsCommit(committedRef.current, next)) return;
    committedRef.current = next;
    if (!onCommit) return;
    flushSync(() => {
      onCommit(next);
    });
  }

  return (
    <Input
      {...props}
      value={draft}
      data-ff-list-option-input=""
      onFocus={(event) => {
        focusedRef.current = true;
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.currentTarget.value;
        draftRef.current = next;
        setDraft(next);
      }}
      onBlur={(event) => {
        focusedRef.current = false;
        commit(draftRef.current);
        onBlur?.(event);
      }}
    />
  );
}
