"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { previewMergedSignature, signatureToPreviewHtml } from "@/lib/templates/signature-html";

export function PersonalSignatureEditor({
  defaultValue,
  agencyPreview,
}: {
  defaultValue: string;
  agencyPreview: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const preview = useMemo(
    () => previewMergedSignature(value.trim() ? value : agencyPreview),
    [agencyPreview, value],
  );
  const usingAgency = !value.trim();

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-ff-personal-signature="">
      <div className="space-y-2">
        <Label className="text-xs">Your close</Label>
        <Textarea
          name="emailSignature"
          rows={7}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Leave blank to use the agency close."
        />

      </div>
      <div className="rounded-md border border-border bg-white px-3 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {usingAgency ? "Agency preview" : "Your preview"}
        </p>
        <div
          className="text-sm leading-6 text-navy"
          dangerouslySetInnerHTML={{
            __html: signatureToPreviewHtml(preview) || "<span class='text-muted-foreground'>No close yet.</span>",
          }}
        />
      </div>
    </div>
  );
}
