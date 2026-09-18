"use client";

import { useState, useTransition } from "react";
import { updateContactField } from "@/app/actions/contacts-ops";
import { ContactDetailField } from "@/components/contacts/contact-detail-field";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

const FLAGS = [
  { key: "is_homeowner", label: "Homeowner" },
  { key: "is_business_owner", label: "Business Owner" },
] as const;

function isChecked(value: string | undefined): boolean {
  return value === "true" || value === "on";
}

/** Independent owner flags — never a radio group. Both may be true. */
export function ContactOwnerFlags({
  values,
  recordId,
  form,
  onChange,
}: {
  values: Record<string, string>;
  recordId?: string;
  form?: string;
  onChange?: (key: string, next: string) => void;
}) {
  const [flags, setFlags] = useState({
    is_homeowner: values.is_homeowner ?? "",
    is_business_owner: values.is_business_owner ?? "",
  });
  const [pending, startTransition] = useTransition();

  function persist(key: (typeof FLAGS)[number]["key"], next: boolean) {
    const stored = next ? "true" : "false";
    setFlags((prev) => ({ ...prev, [key]: stored }));
    onChange?.(key, stored);
    if (!recordId) return;
    startTransition(async () => {
      const result = await updateContactField({ contactId: recordId, fieldKey: key, value: stored });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        setFlags((prev) => ({ ...prev, [key]: values[key] ?? "" }));
        onChange?.(key, values[key] ?? "");
        return;
      }
      flashAction("Saved");
    });
  }

  return (
    <div
      className={cn("col-span-full grid grid-cols-2 gap-2 max-[699px]:grid-cols-1", pending && "opacity-60")}
      data-ff-contact-owner-flags=""
      role="group"
      aria-label="Homeowner and business owner"
    >
      {FLAGS.map((flag) => {
        const checked = isChecked(flags[flag.key]);
        const name = `field_${flag.key}`;
        return (
          <ContactDetailField
            key={flag.key}
            fieldKey={flag.key}
            label={flag.label}
            htmlFor={name}
            compact
          >
            <label className="flex min-h-[1.75rem] w-full cursor-pointer items-center gap-2 px-1 text-sm text-[#002868]">
              <input
                id={name}
                type="checkbox"
                name={name}
                form={form}
                value="true"
                checked={checked}
                onChange={(event) => persist(flag.key, event.target.checked)}
                data-ff-checkbox={flag.key}
                data-ff-independent-flag={flag.key}
              />
              <span>{checked ? "Yes" : "No"}</span>
            </label>
          </ContactDetailField>
        );
      })}
    </div>
  );
}
