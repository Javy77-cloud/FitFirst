"use client";

import { confirmFilledFormForEsign } from "@/app/actions/form-esign";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormFieldDef } from "@/lib/db/schema";

export function FillEsignPanel({
  slug,
  fillId,
  fields,
  values,
  sourceDocumentId,
  docusignReady,
  docusignLabel,
}: {
  slug: string;
  fillId: string | null;
  fields: FormFieldDef[];
  values: Record<string, string>;
  sourceDocumentId: string | null;
  docusignReady: boolean;
  docusignLabel: string | null;
}) {
  const filled = fields.filter((field) => (values[field.key] ?? "").trim()).length;
  return (
    <form action={confirmFilledFormForEsign} className="ff-card space-y-3 p-4" data-ff-fill-esign="">
      <div>
        <h2 className="text-sm font-semibold text-navy">Confirm and send for eSign</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Review the mapped values, then send. Nothing auto-sends.
        </p>
      </div>
      <input type="hidden" name="slug" value={slug} />
      {fillId ? <input type="hidden" name="fillId" value={fillId} /> : null}
      {sourceDocumentId ? <input type="hidden" name="sourceDocumentId" value={sourceDocumentId} /> : null}
      {fields.map((field) => (
        <input key={field.key} type="hidden" name={`value_${field.key}`} value={values[field.key] ?? ""} />
      ))}
      <div className="rounded-md border border-border px-3 py-2 text-xs">
        <p className="font-medium text-navy">
          {filled} of {fields.length} fields filled
        </p>
        <p className="mt-1 text-muted-foreground">
          {docusignReady
            ? `DocuSign sandbox connected${docusignLabel ? ` · ${docusignLabel}` : ""}. Send will try a real envelope.`
            : "DocuSign sandbox is not connected. Confirm still records a local envelope and opens the in-desk test path."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Signer name</Label>
          <Input name="signerName" className="mt-1 h-8" placeholder="Marcus Bell" required />
        </div>
        <div>
          <Label className="text-xs">Signer email</Label>
          <Input
            name="signerEmail"
            type="email"
            className="mt-1 h-8"
            placeholder="marcus@example.com"
            required
          />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirmed" value="true" className="mt-1" required />
        <span>I confirmed this carrier form is ready to send for signature.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          {docusignReady ? "Send to DocuSign" : "Confirm · record test envelope"}
        </Button>
      </div>
    </form>
  );
}
