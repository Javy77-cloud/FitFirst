"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function ChooseFiles({
  name = "file",
  id,
  required,
  accept,
  multiple,
  className,
}: {
  name?: string;
  id?: string;
  required?: boolean;
  accept?: string;
  multiple?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [names, setNames] = useState<string[]>([]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <label
        htmlFor={inputId}
        className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/80"
      >
        Choose files
      </label>
      <input
        id={inputId}
        name={name}
        type="file"
        required={required}
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files;
          setNames(files ? Array.from(files).map((file) => file.name) : []);
        }}
      />
      {names.length > 0 ? (
        <span className="text-xs text-muted-foreground">{names.join(", ")}</span>
      ) : null}
    </div>
  );
}
