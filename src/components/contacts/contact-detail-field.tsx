import type { ReactNode } from "react";
import { isLongContactTextField } from "@/lib/contacts/contact-field-layout";
import { cn } from "@/lib/utils";

export function isContactNameField(key: string): boolean {
  return key === "first_name" || key === "last_name";
}

/**
 * One Contact Details cell. Sketch v4 uses label-above everywhere in a section —
 * never mix label-beside and label-above chrome in the same card.
 */
export function ContactDetailField({
  fieldKey,
  label,
  htmlFor,
  compact: _compact = false,
  children,
}: {
  fieldKey: string;
  label: string;
  htmlFor?: string;
  /** @deprecated Ignored — Contact Details always stacks label above the control. */
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
      data-ff-contact-label-orientation="above"
      data-ff-long-text={longText ? "1" : undefined}
    >
      <div className="flex min-w-0 flex-col">
        <label
          htmlFor={htmlFor}
          className="border-b border-border bg-[var(--ff-wash)] px-2 py-0.5 text-[10px] font-medium uppercase leading-tight tracking-[0.04em] text-muted-foreground"
        >
          {label}
        </label>
        <div
          className={cn(
            "flex min-h-[2.25rem] min-w-0 items-center px-1.5 py-0.5",
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
