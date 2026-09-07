"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ACCEPT =
  ".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*,application/pdf";

export function ChooseFileButton({
  name = "file",
  id,
  accept = ACCEPT,
  required,
  disabled,
  className,
  onFile,
}: {
  name?: string;
  id?: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onFile?: (file: File | null) => void;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  return (
    <label
      htmlFor={inputId}
      className={cn("ff-file-choose", disabled && "pointer-events-none opacity-60", className)}
      data-ff-choose-file=""
    >
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setFileName(file?.name ?? "");
          onFile?.(file);
        }}
      />
      <span className="min-w-0 truncate">{fileName || "Choose file"}</span>
    </label>
  );
}
