"use client";

import { MAILING_SAME_AS_INSURED_KEY } from "@/lib/custom-fields/mailing-same";

export function MailingSameSwitch({
  formId,
  same,
  onToggle,
  commercial = false,
}: {
  formId?: string;
  same: boolean;
  onToggle: (next: boolean) => void;
  commercial?: boolean;
}) {
  const label = commercial
    ? "Mailing address same as business address"
    : "Mailing address same as insured address";
  return (
    <label
      className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-navy"
      data-ff-mailing-same-switch=""
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-[#002868]"
        checked={same}
        onChange={(event) => onToggle(event.target.checked)}
        aria-label={label}
      />
      <span>{label}</span>
      <input
        type="hidden"
        name={`field_${MAILING_SAME_AS_INSURED_KEY}`}
        form={formId}
        value={same ? "true" : "false"}
      />
    </label>
  );
}
