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
  children,
}: {
  fieldKey: string;
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  const nameValue = isContactNameField(fieldKey);
  return (
    <div
      className="overflow-hidden rounded-md border border-border bg-[var(--ff-card)]"
      data-ff-record-field={fieldKey}
      data-ff-contact-field={fieldKey}
    >
      <div className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-stretch">
        <label
          htmlFor={htmlFor}
          className="flex items-center border-r border-border bg-[var(--ff-wash)] px-2 py-1 text-[10px] font-medium uppercase leading-tight tracking-[0.04em] text-muted-foreground"
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
