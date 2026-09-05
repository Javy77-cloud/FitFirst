"use client";

import { useState } from "react";
import Link from "next/link";
import { confirmQuoteSheetField, markPasteFieldWrong, saveQuoteSheet } from "@/app/actions/quote-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Contact, QuoteSheet, QuoteSheetFieldValue } from "@/lib/db/schema";
import { SHOP_LINE_LABELS, type ShopLine } from "@/lib/domain";
import { groupFields } from "@/lib/quote-sheet/catalog";
import { sheetCounts } from "@/lib/quote-sheet/apply";
import { AddressAutofill, type AddressFillMap } from "@/components/address-autofill";
import { CopySheetButton } from "@/components/deal/copy-sheet-button";
import { MarkMappingWrong } from "@/components/deal/mark-mapping-wrong";
import { DeskDetails } from "@/components/desk-details";
import { SUPER_COPY_LABEL, buildCopySheetText } from "@/lib/quote-sheet/super-copy";
import { sheetGroupNeedsAttention, sheetGroupSummary } from "@/lib/quotes/collapse";
import { SheetDrop } from "@/components/deal/sheet-drop";
import { cn } from "@/lib/utils";

export function QuoteSheetForm({
  dealId,
  dealTitle,
  line,
  sheet,
  contact,
  riskId,
  printable = false,
  carriers = [],
}: {
  dealId: string;
  dealTitle: string;
  line: ShopLine;
  sheet: QuoteSheet;
  contact?: Contact | null;
  riskId?: string;
  printable?: boolean;
  carriers?: { id: string; name: string }[];
}) {
  const [showMore, setShowMore] = useState(false);
  const groups = groupFields(line);
  const counts = sheetCounts(sheet.values);
  const contactName = contact ? `${contact.firstName} ${contact.lastName}` : null;
  const copyText = buildCopySheetText({
    line,
    dealId,
    dealTitle,
    values: sheet.values,
    contactName,
    contactDob: contact?.dateOfBirth ?? null,
  });

  return (
    <div className="space-y-4">
      <div className="ff-card p-4 print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-caption uppercase tracking-wide text-muted-foreground">
              Master sheet · this line only
            </p>
            <h2 className="text-lg font-semibold text-navy">
              {SHOP_LINE_LABELS[line]} Quote Sheet
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
            {printable ? null : <CopySheetButton text={copyText} />}
          </div>
        </div>
      </div>

      {printable || !riskId ? null : (
        <SheetDrop dealId={dealId} riskId={riskId} line={line} />
      )}

      <form action={printable ? undefined : saveQuoteSheet} className="space-y-4">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="line" value={line} />

      {groups.map((group) => (
        <DeskDetails
          key={group.group}
          title={group.group}
          summary={sheetGroupSummary(group.fields, sheet.values)}
          open={printable || sheetGroupNeedsAttention(group.fields, sheet.values)}
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
                    readOnly={printable}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMore((v) => !v)}
          >
            {showMore ? "Hide extra fields" : "Show inspections and notes"}
          </Button>
          <CopySheetButton text={copyText} />
          <Button type="submit" size="sm" variant="secondary">
            Save Quote Sheet
          </Button>
          <p className="text-helper text-muted-foreground">
            Saving a correction after ingest writes the Fill Feedback log. Mark paste wrong when a
            carrier field was mapped incorrectly.
          </p>
          <Link
            href={`/api/deals/${dealId}/quote-sheets/${line}/super-copy`}
            className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-[0.8rem] font-medium"
          >
            Super-Copy JSON
          </Link>
          <Link
            href={`/deals/${dealId}/quote-sheet/${line}/print`}
            className="text-xs text-primary hover:underline"
          >
            Print
          </Link>
        </div>
      )}
      {printable ? null : (
        <p className="text-helper text-muted-foreground print:hidden">
          Copy sheet ({SUPER_COPY_LABEL}). Portal paste is you or a bot — no carrier login here.
        </p>
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
  carriers = [],
}: {
  dealId: string;
  line: ShopLine;
  fieldKey: string;
  label: string;
  cell: QuoteSheetFieldValue;
  input?: "text" | "number" | "textarea";
  readOnly?: boolean;
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
    <div>
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
          {cell.status === "check" && !readOnly ? (
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
          {cell.value.trim() && !readOnly && cell.source !== "javy" ? (
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
          {readOnly ? null : (
            <MarkMappingWrong
              dealId={dealId}
              line={line}
              fieldKey={fieldKey}
              fieldLabel={label}
              extractedValue={cell.value}
              carriers={carriers}
            />
          )}
        </div>
      </div>
      {input === "textarea" ? (
        <Textarea
          id={fieldKey}
          name={fieldKey}
          defaultValue={cell.value}
          readOnly={readOnly}
          rows={3}
          className={cn("mt-0 text-sm", toneClass(tone))}
        />
      ) : sheetAddressFill(fieldKey) ? (
        <AddressAutofill
          id={fieldKey}
          name={fieldKey}
          defaultValue={cell.value}
          readOnly={readOnly}
          fill={sheetAddressFill(fieldKey) ?? undefined}
          className={cn("h-8", toneClass(tone))}
        />
      ) : (
        <Input
          id={fieldKey}
          name={fieldKey}
          type={input}
          defaultValue={cell.value}
          readOnly={readOnly}
          className={cn("h-8", toneClass(tone))}
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
