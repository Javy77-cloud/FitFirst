"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function ChooseFiles({
  name = "file",
  id,
  required,
  accept,
  multiple,
  disabled,
  className,
  inputRef,
  onFiles,
}: {
  name?: string;
  id?: string;
  required?: boolean;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onFiles?: (files: File[]) => void;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const localRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function assignRef(node: HTMLInputElement | null) {
    localRef.current = node;
    if (typeof inputRef === "function") inputRef(node);
    else if (inputRef) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
  }

  function applyFiles(list: FileList | File[] | null) {
    const files = list ? Array.from(list) : [];
    setNames(files.map((file) => file.name));
    onFiles?.(files);
  }

  function setDropped(list: FileList | null) {
    const input = localRef.current;
    if (!list?.length || !input) return;
    const transfer = new DataTransfer();
    for (const file of Array.from(list)) transfer.items.add(file);
    input.files = transfer.files;
    applyFiles(transfer.files);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div
      className={cn(
        "ff-file-drop",
        dragOver && !disabled && "ff-file-drop-active",
        disabled && "ff-file-drop-disabled",
        className,
      )}
      data-ff-file-drop=""
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (disabled) return;
        setDropped(event.dataTransfer.files);
      }}
    >
      <label htmlFor={inputId} className="ff-file-choose">
        Choose files
      </label>
      <input
        ref={assignRef}
        id={inputId}
        name={name}
        type="file"
        required={required}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => applyFiles(event.target.files)}
      />
      {names.length > 0 ? (
        <span className="min-w-0 truncate text-xs text-navy">{names.join(", ")}</span>
      ) : (
        <span className="text-xs text-muted-foreground">or drop files here</span>
      )}
    </div>
  );
}
