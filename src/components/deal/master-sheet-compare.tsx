"use client";

import { confirmQuoteSheetField, saveQuoteSheet } from "@/app/actions/quote-sheet";
import { MasterSheetFillButton } from "@/components/deal/master-sheet-fill-button";
import { MasterSheetAddressLinks } from "@/components/deal/master-sheet-address-links";
import { MilesToCoastButton } from "@/components/deal/miles-to-coast-button";
import { sourceTag } from "@/lib/quote-sheet/apply";
import { SheetApproveGate } from "@/components/deal/sheet-approve-gate";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import { RepeatableUnitBlocks } from "@/components/deal/repeatable-unit-blocks";
import { fieldsForLine, groupFields } from "@/lib/quote-sheet/catalog";
import { parseSheetProduct } from "@/lib/quote-sheet/products";
import type { ShopLine } from "@/lib/domain";
import { asList } from "@/lib/safe-list";
import { cn } from "@/lib/utils";
import { sheetGroupHeaderClass } from "@/lib/quote-sheet/sheet-group-style";

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
    const el = document.getElementById(MASTER_SHEET_FORM_ID);
    if (!(el instanceof HTMLFormElement)) throw new Error("Master sheet form is missing.");
    const data = new FormData(el);
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
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <MasterSheetAddressLinks values={values} />
            <MasterSheetFillButton dealId={dealId} line={line} />
            <span className="sr-only" data-ff-master-source-docs={sourceDocCount} />
          </div>
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
                dealId={dealId}
                line={line}
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
  dealId,
  line,
  groupFields,
  values,
}: {
  title: string;
  dealId: string;
  line: ShopLine;
  groupFields: ReturnType<typeof fieldsForLine>;
  values: Record<string, QuoteSheetFieldValue>;
  extractedByKey: Map<string, ExtractedFieldRow>;
}) {
  return (
    <div className="border-b border-border/70 last:border-b-0" data-ff-sheet-group={title}>
      <div className={sheetGroupHeaderClass(title)} data-ff-sheet-group-header={title}>
        {title}
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 px-2 py-1.5 sm:grid-cols-2">
        {asList(groupFields).map((field) => {
          const cell = values[field.key];
          const filled = Boolean(cell?.value.trim() && cell.status !== "missing");
          const sourceText = (cell ? sourceTag(cell) : null) || cell?.sourceLabel || "";
          return (
            <div
              key={field.key}
              id={`sheet-field-${field.key}`}
              className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 rounded-sm px-1 py-0.5 hover:bg-muted/40"
              data-ff-sheet-row={field.key}
            >
              <label
                htmlFor={`ff-sheet-input-${field.key}`}
                className="truncate text-[11px] font-medium leading-tight text-navy"
                title={field.label}
              >
                {field.label}
              </label>
              <div className="min-w-0">
                <SheetCell
                  dealId={dealId}
                  line={line}
                  fieldKey={field.key}
                  fieldLabel={field.label}
                  input={field.input}
                  options={field.options}
                  cell={cell}
                />
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[9px] leading-none text-muted-foreground">
                  {sourceText ? <span data-ff-sheet-source={field.key}>{sourceText}</span> : null}
                  {cell?.status && filled ? (
                    <span
                      className={cn(
                        "uppercase",
                        cell.status === "check" && "text-fit-check",
                        cell.status === "missing" && "text-fit-yellow",
                        cell.status === "confirmed" && "text-fit-green",
                      )}
                    >
                      {cell.status}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SheetCell({
  dealId,
  line,
  fieldKey,
  fieldLabel,
  input = "text",
  options,
  cell,
}: {
  dealId: string;
  line: ShopLine;
  fieldKey: string;
  fieldLabel: string;
  input?: "text" | "number" | "textarea" | "select";
  options?: string[];
  cell?: QuoteSheetFieldValue;
}) {
  const locked = fieldKey === "coverage_a" && cell?.source === "javy";
  const className = cn(
    "h-7 w-full text-xs cursor-text",
    cell?.status === "check" && "ff-field-check",
    (!cell?.value.trim() || cell.status === "missing") && "ff-field-missing",
  );
  const value = cell?.value ?? "";

  return (
    <div className="flex flex-col gap-0.5">
      {input === "textarea" ? (
        <Textarea
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          defaultValue={value}
          rows={2}
          readOnly={locked}
          aria-label={fieldLabel}
          className={cn("min-h-7 py-1 text-xs", className)}
        />
      ) : options && options.length > 0 ? (
        <select
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          defaultValue={value}
          disabled={locked}
          aria-label={fieldLabel}
          data-ff-sheet-picklist={fieldKey}
          className={cn(
            "border-input bg-background rounded-md border px-2 shadow-xs outline-none",
            className,
            locked && "opacity-70",
          )}
        >
          <option value="">Select…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          {value.trim() && !options.includes(value) ? (
            <option value={value}>{value}</option>
          ) : null}
        </select>
      ) : (
        <Input
          id={`ff-sheet-input-${fieldKey}`}
          name={fieldKey}
          type={input === "select" ? "text" : input}
          defaultValue={value}
          readOnly={locked}
          aria-label={fieldLabel}
          className={className}
        />
      )}
      <div className="flex flex-wrap items-center gap-1">
        {cell?.status === "check" && !locked ? (
          <Button
            type="submit"
            formAction={async (formData) => {
              formData.set("fieldKey", fieldKey);
              await confirmQuoteSheetField(formData);
            }}
            variant="ghost"
            size="xs"
            className="h-5 self-start px-1 text-[10px]"
          >
            Confirm
          </Button>
        ) : null}
        {fieldKey === "miles_to_coast" && !locked ? (
          <MilesToCoastButton dealId={dealId} line={line} />
        ) : null}
      </div>
      {locked ? <span className="text-[9px] text-muted-foreground">Ana Cov A locked</span> : null}
    </div>
  );
}
