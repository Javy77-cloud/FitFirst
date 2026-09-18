"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ACCEPT =
  ".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*,application/pdf";

function filesFromList(list: FileList | File[] | null | undefined): File[] {
  return list ? Array.from(list) : [];
}

export function ChooseFileButton({
  name = "file",
  id,
  accept = ACCEPT,
  required,
  disabled,
  className,
  keepLabel,
  multiple,
  assignedFile,
  onFile,
  onFiles,
}: {
  name?: string;
  id?: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  keepLabel?: boolean;
  multiple?: boolean;
  assignedFile?: File | null;
  onFile?: (file: File | null) => void;
  onFiles?: (files: File[]) => void;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  function assignSingle(input: HTMLInputElement, file: File) {
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    } catch {
      // Safari / non-gesture: React state is the submit source of truth.
    }
  }

  function applyPicked(list: FileList | File[] | null | undefined) {
    const picked = filesFromList(list);
    if (picked.length === 0) return;
    const files = multiple ? picked : picked.slice(0, 1);
    const first = files[0]!;
    if (inputRef.current) assignSingle(inputRef.current, first);
    setFileName(first.name);
    onFile?.(first);
    onFiles?.(files);
  }

  useEffect(() => {
    if (!assignedFile || !inputRef.current) return;
    assignSingle(inputRef.current, assignedFile);
    setFileName(assignedFile.name);
  }, [assignedFile]);

  return (
    <label
      htmlFor={inputId}
      title={fileName || undefined}
      className={cn("ff-file-choose min-w-0 overflow-hidden", disabled && "pointer-events-none opacity-60", className)}
      data-ff-choose-file=""
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (disabled) return;
        applyPicked(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => applyPicked(event.target.files)}
      />
      <span className="min-w-0 truncate">{keepLabel ? "Choose file" : fileName || "Choose file"}</span>
    </label>
  );
}
