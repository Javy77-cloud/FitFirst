"use client";

import { useState, useTransition } from "react";
import { saveModuleRecordValues } from "@/app/actions/custom-fields";
import { MaskedPiiField } from "@/components/pii/masked-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { maskLicense } from "@/lib/pii/vault";

export function ContactLicenseField({
  contactId,
  last4,
  canReveal,
  form,
}: {
  contactId: string;
  last4: string | null;
  canReveal: boolean;
  form?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const mask = last4 ? maskLicense(last4) : null;

  if (editing) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2" data-ff-contact-dl-edit="">
        <Input
          name="field_drivers_license_number"
          form={form}
          className="h-9 max-w-[14rem] font-mono"
          placeholder="License number"
          value={value}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={pending || !value.trim()}
          onClick={() => {
            start(async () => {
              const data = new FormData();
              data.set("module", "contacts");
              data.set("recordId", contactId);
              data.set("field_drivers_license_number", value.trim());
              await saveModuleRecordValues(data);
              setEditing(false);
              setValue("");
            });
          }}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2" data-ff-contact-dl-field="">
      <input type="hidden" name="field_drivers_license_number" form={form} value={mask ?? ""} />
      <MaskedPiiField
        entityType="contact"
        entityId={contactId}
        field="license_number"
        mask={mask}
        canReveal={canReveal}
        emptyLabel="—"
      />
      <Button type="button" size="xs" variant="outline" onClick={() => setEditing(true)}>
        {mask ? "Replace" : "Add"}
      </Button>
    </div>
  );
}
