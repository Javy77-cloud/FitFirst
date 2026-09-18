import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function isContactNameField(key: string): boolean {
  return key === "first_name" || key === "last_name";
}

/** One label|value cell for Contact Details — values read first, labels stay secondary. */
export function ContactDetailField({
  fieldKey,
  label,
  htmlFor,
  compact = false,
  children,
}: {
  fieldKey: string;
  label: string;
  htmlFor?: string;
  /** City/state/zip and other short fields stack so the value keeps the column. */
  compact?: boolean;
  children: ReactNode;
}) {
  const nameValue = isContactNameField(fieldKey);
  return (
    <div
      className="overflow-hidden rounded-md border border-border bg-[var(--ff-card)]"
      data-ff-record-field={fieldKey}
      data-ff-contact-field={fieldKey}
      data-ff-contact-field-compact={compact ? "1" : undefined}
    >
      <div
        className={
          compact
            ? "flex min-w-0 flex-col"
            : "grid grid-cols-[6.75rem_minmax(0,1fr)] items-stretch"
        }
      >
        <label
          htmlFor={htmlFor}
          className={
            compact
              ? "border-b border-border bg-[var(--ff-wash)] px-2 py-0.5 text-[10px] font-medium uppercase leading-tight tracking-[0.04em] text-muted-foreground"
              : "flex items-center border-r border-border bg-[var(--ff-wash)] px-2 py-1 text-[10px] font-medium uppercase leading-tight tracking-[0.04em] text-muted-foreground"
          }
        >
          {label}
        </label>
        <div
          className={cn(
            "flex min-h-[2rem] min-w-0 items-center px-1.5 py-0.5",
            nameValue && "[&_[data-ff-click-to-edit]]:text-base [&_[data-ff-click-to-edit]]:font-semibold",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
