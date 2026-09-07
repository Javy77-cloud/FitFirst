"use client";

import { saveFormFill, scanSuggestForm } from "@/app/actions/form-fill";
import { ChooseFiles } from "@/components/choose-files";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormFieldDef } from "@/lib/db/schema";
import { defaultFieldMap } from "@/lib/documents/scan";

export function FillWorkspace({
  slug,
  fillId,
  fields,
  values,
  sourceText,
  sourceDocumentId = null,
  sourceFilename = null,
}: {
  slug: string;
  fillId: string | null;
  fields: FormFieldDef[];
  values: Record<string, string>;
  sourceText: string;
  sourceDocumentId?: string | null;
  sourceFilename?: string | null;
}) {
  const mapping = defaultFieldMap(fields);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form action={scanSuggestForm} className="ff-card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-navy">Fill from source</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a PDF or image, paste extracted lines, or use Scan &amp; suggest. OCR is stubbed —
            suggest pre-fills demo fields (Elena Ruiz Melbourne HO3). Paste wins over demo.
          </p>
        </div>
        <input type="hidden" name="slug" value={slug} />
        {fillId ? <input type="hidden" name="fillId" value={fillId} /> : null}
        <div>
          <Label className="text-xs">Source PDF or image</Label>
          <ChooseFiles name="sourceFile" accept="application/pdf,image/*" className="mt-1" />
          {sourceDocumentId && sourceFilename ? (
            <div className="ff-file-row mt-2 text-sm">
              <FileActionMenu
                documentId={sourceDocumentId}
                filename={sourceFilename}
                slot="library_file"
                docType="other"
                returnTo={`/documents/fill/${slug}${fillId ? `?fillId=${fillId}` : ""}`}
                className="min-w-0 flex-1"
              >
                <span className="font-medium text-navy">{sourceFilename}</span>
              </FileActionMenu>
            </div>
          ) : null}
        </div>
        <div>
          <Label className="text-xs">Paste fields (key: value)</Label>
          <textarea
            name="sourceText"
            defaultValue={sourceText}
            rows={7}
            className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 font-mono text-xs"
            placeholder={"named_insured: Harbor Key Marine LLC\ncoverage_a: 0"}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-navy">Field map (stub)</div>
          <table className="ff-table text-xs">
            <thead>
              <tr>
                <th>Form field</th>
                <th>Source key</th>
              </tr>
            </thead>
            <tbody>
              {mapping.map((row) => (
                <tr key={row.formKey}>
                  <td>{row.formKey}</td>
                  <td className="font-mono">{row.sourceKey}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="submit" size="sm">
          Scan &amp; suggest
        </Button>
      </form>

      <form action={saveFormFill} className="ff-card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-navy">Mapped values</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit any cell after the stub scan. Save keeps a draft fill on this template.
          </p>
        </div>
        <input type="hidden" name="slug" value={slug} />
        {fillId ? <input type="hidden" name="fillId" value={fillId} /> : null}
        <div className="space-y-2">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="text-xs text-muted-foreground">
                {field.group} · {field.label}
              </span>
              <Input
                name={`value_${field.key}`}
                defaultValue={values[field.key] ?? ""}
                className="mt-0.5 h-8"
              />
            </label>
          ))}
        </div>
        <Button type="submit" size="sm" variant="outline">
          Save draft fill
        </Button>
      </form>
    </div>
  );
}
