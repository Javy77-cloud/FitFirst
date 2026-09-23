import type { ReactNode } from "react";
import {
  CONTACT_LABEL_VALUE_GRID,
  isLongContactTextField,
} from "@/lib/contacts/contact-field-layout";
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
  const longText = isLongContactTextField(fieldKey);
  return (
    <div
      className="min-w-0 rounded-md border border-border bg-[var(--ff-card)]"
      data-ff-record-field={fieldKey}
      data-ff-contact-field={fieldKey}
      data-ff-contact-field-compact={compact ? "1" : undefined}
      data-ff-long-text={longText ? "1" : undefined}
    >
      <div
        className={
          compact
            ? "flex min-w-0 flex-col"
            : CONTACT_LABEL_VALUE_GRID
        }
      >
        <label
          htmlFor={htmlFor}
          className={
            compact
              ? "border-b border-border bg-[var(--ff-wash)] px-2 py-0.5 text-[10px] font-medium uppercase leading-tight tracking-[0.04em] text-muted-foreground"
              : "flex items-center border-r border-border bg-[var(--ff-wash)] px-2 py-0.5 text-[10px] font-medium uppercase leading-tight tracking-[0.04em] text-muted-foreground"
          }
        >
          {label}
        </label>
        <div
          className={cn(
            "flex min-h-[1.75rem] min-w-0 items-center px-1.5 py-0.5",
            longText && "items-start py-1 [&_*]:break-all [&_*]:whitespace-normal",
            nameValue && "[&_[data-ff-click-to-edit]]:text-base [&_[data-ff-click-to-edit]]:font-semibold",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
