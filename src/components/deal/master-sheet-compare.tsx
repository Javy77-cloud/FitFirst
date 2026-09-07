"use client";

import { confirmQuoteSheetField, saveQuoteSheet } from "@/app/actions/quote-sheet";
import { fillQuoteSheetBlanks } from "@/app/actions/lifecycle";
import { SheetApproveGate } from "@/components/deal/sheet-approve-gate";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import { RepeatableUnitBlocks } from "@/components/deal/repeatable-unit-blocks";
import { fieldsForLine, groupFields } from "@/lib/quote-sheet/catalog";
import { parseSheetProduct, SHEET_PRODUCT_LABELS } from "@/lib/quote-sheet/products";
import type { ShopLine } from "@/lib/domain";
import { asList } from "@/lib/safe-list";
import { cn } from "@/lib/utils";

const MASTER_SHEET_FORM_ID = "ff-master-sheet-save";

export function MasterSheetWorkspace({
  dealId,
  line,
  fields,
  values,
  product,
  sourceDocCount = 0,
  formLabel,
  unlocked,
  approvedBy,
}: {
  dealId: string;
  line: ShopLine;
  fields: ExtractedFieldRow[];
  values: Record<string, QuoteSheetFieldValue>;
  product?: string | null;
  sourceDocCount?: number;
  formLabel: string;
  unlocked: boolean;
  approvedBy?: string | null;
}) {
  async function persistSheet(opts?: { flash?: boolean }) {
    const form = document.getElementById(MASTER_SHEET_FORM_ID) as HTMLFormElement | null;
    if (!form) throw new Error("Master sheet form is missing.");
    const data = new FormData(form);
    if (opts?.flash === false) data.set("flash", "0");
    await saveQuoteSheet(data);
  }

  return (
    <>
      <MasterSheetCompare
        dealId={dealId}
        line={line}
        fields={fields}
        values={values}
        product={product}
        sourceDocCount={sourceDocCount}
        formId={MASTER_SHEET_FORM_ID}
        persistSheet={() => persistSheet()}
      />
      <SheetApproveGate
        dealId={dealId}
        line={line}
        formLabel={formLabel}
        unlocked={unlocked}
        approvedBy={approvedBy}
        persistSheet={() => persistSheet({ flash: false })}
      />
    </>
  );
}

export function MasterSheetCompare({
  dealId,
  line,
  fields,
  values,
  product: productParam,
  sourceDocCount = 0,
  formId = MASTER_SHEET_FORM_ID,
  persistSheet,
}: {
  dealId: string;
  line: ShopLine;
  fields: ExtractedFieldRow[];
  values: Record<string, QuoteSheetFieldValue>;
  product?: string | null;
  sourceDocCount?: number;
  formId?: string;
  persistSheet?: () => Promise<void>;
}) {
  const product = parseSheetProduct(productParam ?? values.sheet_product?.value, line);
  const catalog = asList(fieldsForLine(line, product));
  const groups = asList(groupFields(line, product));
  const extractedByKey = new Map(asList(fields).map((field) => [field.fieldKey, field]));
  const filled = catalog.filter((field) => {
    const cell = values[field.key];
    return Boolean(cell?.value.trim() && cell.status !== "missing");
  }).length;

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (!(submitter instanceof HTMLElement) || submitter.getAttribute("data-ff-save-sheet") == null) {
      return;
    }
    event.preventDefault();
    if (persistSheet) {
      await persistSheet();
      return;
    }
    await saveQuoteSheet(new FormData(event.currentTarget));
  }

  return (
    <section className="ff-card overflow-hidden" data-ff-master-sheet-compare>
      <div className="border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-navy">Master sheet</h3>
            <p className="text-helper text-muted-foreground">
              Empty before extraction. Type a value or confirm what the source pulled.
              {filled === 0 ? " Fields start blank." : ` ${filled} filled.`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {SHEET_PRODUCT_LABELS[product]} · one product on this deal
            </p>
          </div>
          <form action={fillQuoteSheetBlanks} className="shrink-0">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="line" value={line} />
            <Button type="submit" size="xs" variant="outline" disabled={sourceDocCount === 0}>
              Fill from source
            </Button>
          </form>
        </div>
      </div>

      <form
        id={formId}
        action={saveQuoteSheet}
        onSubmit={onSave}
        className="space-y-0"
        data-ff-master-sheet-form=""
      >
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="sheet_product" value={product} />
        <input type="hidden" name="returnTo" value={`/deals/${dealId}?tab=documents&line=${line}`} />
        <div data-ff-master-sheet-scroll="" className="overflow-visible">
          {groups.map((group) =>
            group.group === "Vehicle" && line === "auto" ? (
              <RepeatableUnitBlocks
                key={group.group}
                kind="vehicle"
                product={product}
                values={values}
                extractedByKey={extractedByKey}
              />
            ) : group.group === "Drivers" && line === "auto" ? (
              <RepeatableUnitBlocks
                key={group.group}
                kind="driver"
                product={product}
                values={values}
                extractedByKey={extractedByKey}
              />
            ) : (
              <SheetGroup
                key={group.group}
                title={group.group}
                groupFields={asList(group.fields)}
                values={values}
                extractedByKey={extractedByKey}
              />
            ),
          )}
        </div>
        <div className="border-t border-border px-3 py-2">
          <button type="submit" className={buttonVariants({ size: "sm" })} data-ff-save-sheet="">
            Save sheet
          </button>
        </div>
      </form>
    </section>
  );
}

function SheetGroup({
  title,
  groupFields,
  values,
  extractedByKey,
}: {
  title: string;
  groupFields: ReturnType<typeof fieldsForLine>;
  values: Record<string, QuoteSheetFieldValue>;
  extractedByKey: Map<string, ExtractedFieldRow>;
}) {
  return (
    <div className="border-b border-border/70 last:border-b-0">
      <div className="sticky top-0 z-10 bg-muted/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy">
        {title}
      </div>
      <table className="ff-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Source</th>
            <th>Sheet</th>
          </tr>
        </thead>
        <tbody>
          {asList(groupFields).map((field) => {
            const extracted = extractedByKey.get(field.key) ?? extractedByKey.get(field.extractKey ?? "");
            const cell = values[field.key];
            const filled = Boolean(cell?.value.trim() && cell.status !== "missing");
            const sourceText = extracted?.normalizedValue || extracted?.rawValue || "";
            return (
              <tr key={field.key} id={`sheet-field-${field.key}`}>
                <td className="align-top font-medium">{field.label}</td>
                <td className="align-top text-muted-foreground">{sourceText || "—"}</td>
                <td className="align-top">
                  <SheetCell fieldKey={field.key} input={field.input} cell={cell} />
                  {cell?.status && filled ? (
                    <span
                      className={cn(
                        "mt-0.5 block text-[10px] uppercase",
                        cell.status === "check" && "text-fit-check",
                        cell.status === "missing" && "text-fit-yellow",
                        cell.status === "confirmed" && "text-fit-green",
                      )}
                    >
                      {cell.status}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SheetCell({
  fieldKey,
  input = "text",
  cell,
}: {
  fieldKey: string;
  input?: "text" | "number" | "textarea";
  cell?: QuoteSheetFieldValue;
}) {
  const locked = fieldKey === "coverage_a" && cell?.source === "javy";
  const className = cn(
    "h-8 text-sm",
    cell?.status === "check" && "ff-field-check",
    (!cell?.value.trim() || cell.status === "missing") && "ff-field-missing",
  );

  return (
    <div className="flex flex-col gap-1">
      {input === "textarea" ? (
        <Textarea
          name={fieldKey}
          defaultValue={cell?.value ?? ""}
          rows={2}
          readOnly={locked}
          className={cn("text-sm", className)}
        />
      ) : (
        <Input
          name={fieldKey}
          type={input}
          defaultValue={cell?.value ?? ""}
          readOnly={locked}
          className={className}
        />
      )}
      {cell?.status === "check" && !locked ? (
        <Button
          type="submit"
          formAction={confirmQuoteSheetField}
          name="fieldKey"
          value={fieldKey}
          variant="ghost"
          size="xs"
        >
          Confirm extracted
        </Button>
      ) : null}
      {locked ? <span className="text-[10px] text-muted-foreground">Ana Cov A locked</span> : null}
    </div>
  );
}
