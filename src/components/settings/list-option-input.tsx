"use client";

import { useEffect, useRef, type ComponentProps, type Ref } from "react";
import { flushSync } from "react-dom";
import { Input } from "@/components/ui/input";
import { listOptionNeedsCommit } from "@/lib/settings/list-editor";

type ListOptionInputProps = Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange"> & {
  /** Last committed / saved label. The DOM owns the draft while typing. */
  committedValue: string;
  /** Parent or persist hook — blur only, never each keystroke. */
  onCommit?: (next: string) => void;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}

/**
 * Settings list / picklist / layout option name field.
 * Uncontrolled: keystrokes never call setState, so a parent re-render, color
 * row, or server action cannot remount or block the field mid-letter.
 * Commits on blur (Save still reads the live DOM value).
 */
export function ListOptionInput({
  committedValue,
  onCommit,
  onFocus,
  onBlur,
  ref,
  autoComplete = "off",
  ...props
}: ListOptionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(committedValue);
  const focusedRef = useRef(false);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (focusedRef.current) return;
    committedRef.current = committedValue;
    const node = inputRef.current;
    if (node && node.value !== committedValue) node.value = committedValue;
  }, [committedValue]);

  function commit(next: string) {
    if (!listOptionNeedsCommit(committedRef.current, next)) return;
    committedRef.current = next;
    const notify = onCommitRef.current;
    if (!notify) return;
    flushSync(() => {
      notify(next);
    });
  }

  return (
    <Input
      {...props}
      ref={(node) => {
        inputRef.current = node;
        assignRef(ref, node);
      }}
      defaultValue={committedValue}
      autoComplete={autoComplete}
      autoCorrect="off"
      spellCheck={false}
      data-ff-list-option-input=""
      data-1p-ignore=""
      data-lpignore="true"
      onFocus={(event) => {
        focusedRef.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focusedRef.current = false;
        commit(event.currentTarget.value);
        onBlur?.(event);
      }}
    />
  );
}
