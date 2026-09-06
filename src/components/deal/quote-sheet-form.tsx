"use client";

import { useState } from "react";
import Link from "next/link";
import { confirmQuoteSheetField, markPasteFieldWrong, saveQuoteSheet } from "@/app/actions/quote-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Contact, Document, QuoteSheet, QuoteSheetFieldValue } from "@/lib/db/schema";
import { SHOP_LINE_LABELS, type ShopLine } from "@/lib/domain";
import { groupFields } from "@/lib/quote-sheet/catalog";
import { sheetCounts } from "@/lib/quote-sheet/apply";
import { AddressAutofill, type AddressFillMap } from "@/components/address-autofill";
import { MarkMappingWrong } from "@/components/deal/mark-mapping-wrong";
import { DeskDetails } from "@/components/desk-details";
import { SheetDrop } from "@/components/deal/sheet-drop";
import {
  CANCEL_EDIT_LABEL,
  SAVE_SHEET_LABEL,
  editSheetLabel,
} from "@/lib/quote-sheet/toolbar";
import { sheetGroupNeedsAttention, sheetGroupSummary } from "@/lib/quotes/collapse";
import { sheetFieldDomId } from "@/lib/completeness/fix-href";
import { cn } from "@/lib/utils";

export function QuoteSheetForm({
  dealId,
  dealTitle,
  line,
  sheet,
  contact,
  riskId,
  printable = false,
  sourceDocCount = 0,
  startEditing = false,
  carriers = [],
  docs = [],
}: {
  dealId: string;
  dealTitle: string;
  line: ShopLine;
  sheet: QuoteSheet;
  contact?: Contact | null;
  riskId?: string;
  printable?: boolean;
  sourceDocCount?: number;
  startEditing?: boolean;
  carriers?: { id: string; name: string }[];
  docs?: Document[];
}) {
  const counts = sheetCounts(sheet.values);
  const blankSheet = counts.confirmed === 0 && counts.check === 0;
  const [editing, setEditing] = useState(startEditing && !printable);
  const [formKey, setFormKey] = useState(0);
  const groups = groupFields(line);
  const contactName = contact ? `${contact.firstName} ${contact.lastName}` : null;
  const locked = printable || !editing;
  const editLabel = editSheetLabel(blankSheet);

  function cancelEdit() {
    setEditing(false);
    setFormKey((key) => key + 1);
  }

  return (
    <div className="space-y-4">
      <div className="ff-card p-4 print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Quote Sheet · this line only
            </p>
            <h2 className="text-lg font-semibold text-navy">
              {SHOP_LINE_LABELS[line]} Quote Sheet
              {dealTitle ? <span className="sr-only"> for {dealTitle}</span> : null}
            </h2>
            <p className="mt-1 text-helper text-muted-foreground">
              Yellow = missing. Blue = CHECK (use the value). People and DOB stay on the
              Contact
              {contactName ? ` · ${contactName}` : ""}
              {contact?.dateOfBirth ? ` · DOB ${contact.dateOfBirth}` : ""}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-caption">
            <span className="rounded-sm bg-fit-yellow-bg px-2 py-0.5 text-fit-yellow">
              {counts.missing} missing
            </span>
            <span className="rounded-sm bg-fit-check-bg px-2 py-0.5 text-fit-check">
              {counts.check} CHECK
            </span>
            <span className="rounded-sm bg-fit-green-bg px-2 py-0.5 text-fit-green">
              {counts.confirmed} confirmed
            </span>
          </div>
        </div>

        {printable ? null : editing ? (
          <div className="mt-4 rounded-md border border-primary/30 bg-fit-check-bg/40 px-3 py-3">
            <p className="text-sm font-semibold text-navy">Editing the whole sheet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Type or correct any field — yellow missing, blue CHECK, or a blank sheet. No PDF
              required. Save writes this Quote Sheet so you do not retype it later.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-md border-2 border-primary bg-primary/5 px-4 py-4">
            <p className="text-base font-semibold text-navy">
              {blankSheet ? "Enter this Quote Sheet by hand" : "Correct any field on this sheet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {sourceDocCount === 0
                ? "No source docs on this deal. Fill the sheet yourself — upload a dec later if you want Fill from source docs."
                : "Unlock every field to type over yellow missing or blue CHECK rows. Fill from source docs stays available."}
            </p>
            <Button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-3 h-14 min-w-52 px-8 text-lg font-semibold"
            >
              {editLabel}
            </Button>
          </div>
        )}
      </div>

      {printable || !riskId ? null : (
        <SheetDrop dealId={dealId} riskId={riskId} line={line} docs={docs} />
      )}

      <form key={formKey} action={printable ? undefined : saveQuoteSheet} className="space-y-4">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="line" value={line} />

      {groups.map((group) => (
        <DeskDetails
          key={group.group}
          title={group.group}
          summary={sheetGroupSummary(group.fields, sheet.values)}
          open={printable || editing || sheetGroupNeedsAttention(group.fields, sheet.values)}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:break-inside-avoid">
            {group.fields.map((field) => {
              const cell = sheet.values[field.key] ?? {
                value: "",
                status: "missing" as const,
                source: "blank" as const,
              };
              const wide = field.input === "textarea";
              return (
                <div key={field.key} className={cn(wide && "sm:col-span-2 lg:col-span-3")}>
                  <SheetField
                    dealId={dealId}
                    line={line}
                    fieldKey={field.key}
                    label={field.label}
                    cell={cell}
                    input={field.input}
                    readOnly={locked}
                    editing={editing && !printable}
                    printable={printable}
                    carriers={carriers}
                  />
                </div>
              );
            })}
          </div>
        </DeskDetails>
      ))}

      {printable ? null : (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {editing ? (
            <>
              <Button type="submit" className="h-11 min-w-40 px-6 text-base font-semibold">
                {SAVE_SHEET_LABEL}
              </Button>
              <Button type="button" variant="outline" className="h-11 px-5" onClick={cancelEdit}>
                {CANCEL_EDIT_LABEL}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className="h-11 min-w-40 px-6 text-base font-semibold"
              onClick={() => setEditing(true)}
            >
              {editLabel}
            </Button>
          )}
          <Link
            href={`/deals/${dealId}/quote-sheet/${line}/print`}
            className="text-xs text-primary hover:underline"
          >
            Print
          </Link>
        </div>
      )}
      </form>
    </div>
  );
}

function sourceTag(cell: QuoteSheetFieldValue) {
  if (cell.source === "javy") return "Javy-tested";
  if (cell.sourceLabel) return cell.sourceLabel;
  if (cell.source === "extracted") return "Uploaded dec";
  if (cell.source === "public") return "Public records";
  if (cell.source === "agent") return "You typed";
  if (cell.source === "seed") return "Seed";
  return null;
}

function SheetField({
  dealId,
  line,
  fieldKey,
  label,
  cell,
  input = "text",
  readOnly,
  editing,
  printable,
  carriers = [],
}: {
  dealId: string;
  line: ShopLine;
  fieldKey: string;
  label: string;
  cell: QuoteSheetFieldValue;
  input?: "text" | "number" | "textarea";
  readOnly?: boolean;
  editing?: boolean;
  printable?: boolean;
  carriers?: { id: string; name: string }[];
}) {
  const tone =
    cell.status === "check"
      ? "check"
      : cell.value.trim() === "" || cell.status === "missing"
        ? "missing"
        : "ok";
  const tag = sourceTag(cell);

  return (
    <div id={sheetFieldDomId(fieldKey)}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label htmlFor={fieldKey} className="text-xs">
          {label}
          {cell.status === "check" ? (
            <span className="ml-1 font-normal text-fit-check">CHECK</span>
          ) : cell.source === "javy" ? (
            <span className="ml-1 font-normal text-fit-green">Javy-tested</span>
          ) : null}
        </Label>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {cell.status === "check" && !printable ? (
            <Button
              type="submit"
              formAction={confirmQuoteSheetField}
              name="fieldKey"
              value={fieldKey}
              variant="ghost"
              size="xs"
            >
              Confirm
            </Button>
          ) : null}
          {cell.value.trim() && editing && cell.source !== "javy" ? (
            <Button
              type="submit"
              formAction={markPasteFieldWrong}
              name="fieldKey"
              value={fieldKey}
              variant="ghost"
              size="xs"
            >
              Mark paste wrong
            </Button>
          ) : null}
          {editing ? (
            <MarkMappingWrong
              dealId={dealId}
              line={line}
              fieldKey={fieldKey}
              fieldLabel={label}
              extractedValue={cell.value}
              carriers={carriers}
            />
          ) : null}
        </div>
      </div>
      {input === "textarea" ? (
        <Textarea
          id={fieldKey}
          name={fieldKey}
          defaultValue={cell.value}
          readOnly={readOnly}
          rows={3}
          className={cn("mt-0 text-sm", toneClass(tone), editing && "ring-1 ring-primary/30")}
        />
      ) : sheetAddressFill(fieldKey) ? (
        <AddressAutofill
          id={fieldKey}
          name={fieldKey}
          defaultValue={cell.value}
          readOnly={readOnly}
          fill={sheetAddressFill(fieldKey) ?? undefined}
          className={cn("h-8", toneClass(tone), editing && "ring-1 ring-primary/30")}
        />
      ) : (
        <Input
          id={fieldKey}
          name={fieldKey}
          type={input}
          defaultValue={cell.value}
          readOnly={readOnly}
          className={cn("h-8", toneClass(tone), editing && "ring-1 ring-primary/30")}
        />
      )}
      {tag ? <p className="mt-0.5 text-helper text-muted-foreground">{tag}</p> : null}
    </div>
  );
}

function sheetAddressFill(fieldKey: string): AddressFillMap | null {
  if (fieldKey === "address1") {
    return { city: "city", state: "state", zip: "zip", county: "county" };
  }
  if (fieldKey === "mailing_address") {
    return { city: "city", state: "state", zip: "zip" };
  }
  if (fieldKey === "garaging_address") {
    return { zip: "garaging_zip" };
  }
  return null;
}

function toneClass(tone: "missing" | "check" | "ok") {
  if (tone === "missing") return "ff-field-missing";
  if (tone === "check") return "ff-field-check";
  return "";
}
