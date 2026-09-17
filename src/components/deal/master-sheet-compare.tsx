"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmQuoteSheetField, saveQuoteSheet } from "@/app/actions/quote-sheet";
import { MasterSheetFillButton } from "@/components/deal/master-sheet-fill-button";
import { MasterSheetAddressLinks } from "@/components/deal/master-sheet-address-links";
import { MilesToCoastButton } from "@/components/deal/miles-to-coast-button";
import { sourceTag } from "@/lib/quote-sheet/apply";
import { SheetApproveGate } from "@/components/deal/sheet-approve-gate";
import { ACTION_FLASH_MESSAGE, SHEET_CONFIRM_HASH } from "@/lib/desk/action-flash";
import { flashAction } from "@/lib/flash-client";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import { ApplicantHousehold } from "@/components/deal/applicant-household";
import { RepeatableUnitBlocks } from "@/components/deal/repeatable-unit-blocks";
import { fieldsForLine, groupFields, sheetFieldIsVisible, sheetGroupIsVisible } from "@/lib/quote-sheet/catalog";
import { parseSheetProduct } from "@/lib/quote-sheet/products";
import { RISK_PROFILE_LABEL, SAVE_RISK_PROFILE_LABEL } from "@/lib/quote-sheet/risk-profile-copy";
import type { QuoteFieldDef } from "@/lib/quote-sheet/applicant-core";
import type { ShopLine } from "@/lib/domain";
import { asList } from "@/lib/safe-list";
import { cn } from "@/lib/utils";
import { SHEET_GROUP_HEADER_STYLE, sheetGroupHeaderClass } from "@/lib/quote-sheet/sheet-group-style";

const MASTER_SHEET_FORM_ID = "ff-master-sheet-save";

/** Heather Save is the sheet Save — pull files from the sibling Upload form. */
function appendSourceDocUploads(data: FormData) {
  if (typeof document === "undefined") return;
  const upload = document.querySelector("[data-ff-source-docs-upload]");
  if (!(upload instanceof HTMLFormElement)) return;
  const extra = new FormData(upload);
  let files = 0;
  for (const [key, value] of extra.entries()) {
    if (typeof value === "string") {
      if (
        (key === "rowCount" || key === "riskId" || key.startsWith("docType")) &&
        !data.has(key)
      ) {
        data.set(key, value);
      }
      continue;
    }
    data.append(key, value);
    files += 1;
  }
  if (files > 0 && extra.get("rowCount") && !data.get("rowCount")) {
    data.set("rowCount", String(extra.get("rowCount")));
  }
}

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
  hasCoApplicantFlag,
  needsReapprove = false,
  hasRequestedQuotes = false,
  productId,
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
  hasCoApplicantFlag?: string | null;
  needsReapprove?: boolean;
  hasRequestedQuotes?: boolean;
  productId?: string | null;
}) {
  const router = useRouter();

  async function persistSheet(opts?: { flash?: boolean }) {
    const el = document.getElementById(MASTER_SHEET_FORM_ID);
    if (!(el instanceof HTMLFormElement)) throw new Error("Risk Profile form is missing.");
    const data = new FormData(el);
    appendSourceDocUploads(data);
    // Stay on Confirm — a redirect remounts the deal page at the top.
    data.set("flash", "0");
    await saveQuoteSheet(data);
    if (opts?.flash === false) return;
    flashAction(ACTION_FLASH_MESSAGE["sheet-saved"]);
    router.refresh();
    requestAnimationFrame(() => {
      document.getElementById(SHEET_CONFIRM_HASH)?.scrollIntoView({
        behavior: "auto",
        block: "center",
      });
    });
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
        hasCoApplicantFlag={hasCoApplicantFlag}
      />
      <SheetApproveGate
        dealId={dealId}
        line={line}
        product={productId}
        formLabel={formLabel}
        unlocked={unlocked}
        approvedBy={approvedBy}
        persistSheet={() => persistSheet({ flash: false })}
        needsReapprove={needsReapprove}
        hasRequestedQuotes={hasRequestedQuotes}
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
  hasCoApplicantFlag,
}: {
  dealId: string;
  line: ShopLine;
  fields: ExtractedFieldRow[];
  values: Record<string, QuoteSheetFieldValue>;
  product?: string | null;
  sourceDocCount?: number;
  formId?: string;
  persistSheet?: () => Promise<void>;
  hasCoApplicantFlag?: string | null;
}) {
  const product = parseSheetProduct(productParam ?? values.sheet_product?.value, line);
  const catalog = asList(fieldsForLine(line, product));
  const groups = asList(groupFields(line, product));
  const extractedByKey = new Map(asList(fields).map((field) => [field.fieldKey, field]));
  const [liveValues, setLiveValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(catalog.map((field) => [field.key, values[field.key]?.value ?? ""])),
  );
  const filled = catalog.filter((field) => {
    const cell = values[field.key];
    return Boolean(cell?.value.trim() && cell.status !== "missing");
  }).length;

  function onSheetFormChange(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }
    const name = target.name;
    if (!name) return;
    const data = new FormData(event.currentTarget);
    const joined = data
      .getAll(name)
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join(", ");
    setLiveValues((prev) => ({ ...prev, [name]: joined }));
  }

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
    const data = new FormData(event.currentTarget);
    appendSourceDocUploads(data);
    await saveQuoteSheet(data);
  }

  return (
    <section className="ff-card overflow-hidden" data-ff-master-sheet-compare>
      <div className="border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-navy">{RISK_PROFILE_LABEL}</h3>
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
        onChange={onSheetFormChange}
        className="space-y-0"
        data-ff-master-sheet-form=""
        data-ff-risk-profile-form=""
      >
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="line" value={line} />
        <input type="hidden" name="sheet_product" value={product} />
        <input
          type="hidden"
          name="returnTo"
          value={`/deals/${dealId}?tab=documents&line=${line}#${SHEET_CONFIRM_HASH}`}
        />
        <div data-ff-master-sheet-scroll="" className="overflow-visible">
          {groups.map((group) => {
            const useAutoRepeaters = line === "auto";
            if (group.group === "Applicant") {
              return (
                <ApplicantHousehold key="applicant-household" values={values} hasCoApplicantFlag={hasCoApplicantFlag} />
              );
            }
            if (group.group === "Co-applicant") return null;
            if (useAutoRepeaters && (group.group === "Vehicle" || group.group === "Vehicles")) {
              return (
                <RepeatableUnitBlocks
                  key={group.group}
                  kind="vehicle"
                  product={product}
                  values={values}
                  extractedByKey={extractedByKey}
                  dealId={dealId}
                  line={line}
                />
              );
            }
            if (useAutoRepeaters && group.group === "Drivers") {
              return (
                <RepeatableUnitBlocks
                  key={group.group}
                  kind="driver"
                  product={product}
                  values={values}
                  extractedByKey={extractedByKey}
                />
              );
            }
            if (useAutoRepeaters && (group.group === "Household" || group.group === "Household members")) {
              return (
                <RepeatableUnitBlocks
                  key={group.group}
                  kind="household"
                  product={product}
                  values={values}
                  extractedByKey={extractedByKey}
                />
              );
            }
            return (
              <SheetGroup
                key={group.group}
                title={group.group}
                dealId={dealId}
                line={line}
                groupFields={asList(group.fields)}
                values={values}
                liveValues={liveValues}
                extractedByKey={extractedByKey}
              />
            );
          })}
        </div>
        <div className="border-t border-border px-3 py-2">
          <button type="submit" className={buttonVariants({ size: "sm" })} data-ff-save-sheet="">
            {SAVE_RISK_PROFILE_LABEL}
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
  liveValues,
}: {
  title: string;
  dealId: string;
  line: ShopLine;
  groupFields: ReturnType<typeof fieldsForLine>;
  values: Record<string, QuoteSheetFieldValue>;
  liveValues: Record<string, string>;
  extractedByKey: Map<string, ExtractedFieldRow>;
}) {
  const rows = asList(groupFields);
  const groupVisible = sheetGroupIsVisible(rows, liveValues);
  return (
    <div
      className={groupVisible ? "border-b border-border/70 last:border-b-0" : undefined}
      data-ff-sheet-group={title}
      data-ff-sheet-group-hidden={groupVisible ? undefined : "true"}
      hidden={!groupVisible}
    >
      {groupVisible ? (
        <div className={sheetGroupHeaderClass(title)} style={SHEET_GROUP_HEADER_STYLE} data-ff-sheet-group-header={title}>
          {title}
        </div>
      ) : null}
      <div className={groupVisible ? "grid grid-cols-1 gap-x-4 gap-y-1 px-2 py-1.5 sm:grid-cols-2" : undefined}>
        {rows.map((field) => {
          const cell = values[field.key];
          const visible = groupVisible && sheetFieldIsVisible(field, liveValues);
          if (!visible) {
            return (
              <input
                key={field.key}
                type="hidden"
                name={field.key}
                value={liveValues[field.key] ?? cell?.value ?? ""}
              />
            );
          }
          const filled = Boolean(cell?.value.trim() && cell.status !== "missing");
          const sourceText = (cell ? sourceTag(cell) : null) || cell?.sourceLabel || "";
          return (
            <div
              key={field.key}
              id={`sheet-field-${field.key}`}
              className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 rounded-sm px-1 py-0.5 hover:bg-muted/40"
              data-ff-sheet-row={field.key}
              data-ff-sheet-cascade={field.showWhen ? field.showWhen.key : undefined}
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
                  liveValue={liveValues[field.key] ?? cell?.value ?? ""}
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

function selectedMultiValues(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function SheetCell({
  dealId,
  line,
  fieldKey,
  fieldLabel,
  input = "text",
  options,
  cell,
  liveValue,
}: {
  dealId: string;
  line: ShopLine;
  fieldKey: string;
  fieldLabel: string;
  input?: QuoteFieldDef["input"];
  options?: string[];
  cell?: QuoteSheetFieldValue;
  liveValue?: string;
}) {
  const locked = fieldKey === "coverage_a" && cell?.source === "javy";
  const className = cn(
    "h-7 w-full text-xs cursor-text",
    cell?.status === "check" && "ff-field-check",
    (!cell?.value.trim() || cell.status === "missing") && "ff-field-missing",
  );
  const value = liveValue ?? cell?.value ?? "";

  return (
    <div className="flex flex-col gap-0.5">
      {input === "multiselect" && options && options.length > 0 ? (
        <fieldset
          data-ff-sheet-multiselect={fieldKey}
          className="grid gap-1 rounded-md border border-input bg-background px-2 py-1.5"
        >
          <legend className="sr-only">{fieldLabel}</legend>
          <input type="hidden" name={fieldKey} value="" />
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-[11px] leading-tight text-navy">
              <input
                type="checkbox"
                name={fieldKey}
                value={opt}
                defaultChecked={selectedMultiValues(value).includes(opt)}
                disabled={locked}
                className="size-3.5 accent-[var(--ff-navy,#1e293b)]"
              />
              <span>{opt}</span>
            </label>
          ))}
        </fieldset>
      ) : input === "textarea" ? (
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
          <option value="">None</option>
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
