"use client";

import { saveDealFieldValues, uploadDealFieldImage } from "@/app/actions/custom-fields";
import { FieldControl } from "@/components/custom-fields/field-control";
import { Button } from "@/components/ui/button";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { parseLayout, type CustomFieldDef, type FieldLayout } from "@/lib/custom-fields/types";
import { asList } from "@/lib/safe-list";

export function DealDetailsPanel({
  dealId,
  line,
  layout,
  fields,
  values,
}: {
  dealId: string;
  line: string;
  layout: FieldLayout;
  fields: CustomFieldDef[];
  values: Record<string, string>;
}) {
  const safeLayout = parseLayout(layout);
  const fieldList = asList(fields);
  const byKey = Object.fromEntries(fieldList.map((field) => [field.key, field]));

  return (
    <div data-ff-deal-details>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <EditLayoutLink module="deals" line={line} />
      </div>
      <form action={saveDealFieldValues} id="deal-details-save">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="line" value={line} />
      </form>
      <div
        className="grid grid-cols-2 gap-4 max-[699px]:grid-cols-1"
        data-ff-deal-details-layout="two-col"
      >
        {asList(safeLayout.columns).map((column) => (
          <div key={column.id} className="min-w-0 space-y-3" data-ff-deal-details-col={column.id}>
            {asList(column.sections).map((section) => (
              <section key={section.id} className="ff-card space-y-2 p-3" data-ff-deal-section={section.id}>
                <h3 className="text-xs font-medium text-navy">{section.label}</h3>
                {asList(section.fieldKeys).map((key) => {
                  const field = byKey[key];
                  if (!field) return null;
                  return (
                    <div key={key} className="space-y-1" data-ff-deal-field={key}>
                      <label className="text-xs font-medium text-navy" htmlFor={`field_${key}`}>
                        {field.label}
                      </label>
                      <FieldControl
                        field={field}
                        value={values[key] ?? ""}
                        values={values}
                        name={`field_${key}`}
                        form="deal-details-save"
                      />
                      {field.type === "image" ? (
                        <form action={uploadDealFieldImage} className="flex items-center gap-2">
                          <input type="hidden" name="dealId" value={dealId} />
                          <input type="hidden" name="key" value={key} />
                          <input type="file" name="file" accept="image/*" className="text-xs" />
                          <Button type="submit" size="xs" variant="outline">
                            Upload
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="submit" form="deal-details-save">
          Save deal details
        </Button>
      </div>
    </div>
  );
}
