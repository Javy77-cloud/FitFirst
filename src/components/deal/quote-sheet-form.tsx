import Link from "next/link";
import { confirmQuoteSheetField, saveQuoteSheet } from "@/app/actions/quote-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Contact, QuoteSheet, QuoteSheetFieldValue } from "@/lib/db/schema";
import { SHOP_LINE_LABELS, type ShopLine } from "@/lib/domain";
import { groupFields } from "@/lib/quote-sheet/catalog";
import { sheetCounts } from "@/lib/quote-sheet/apply";
import { CopySheetButton } from "@/components/deal/copy-sheet-button";
import { COPY_SHEET_PORTAL_NOTE, SUPER_COPY_LABEL, buildCopySheetText } from "@/lib/quote-sheet/super-copy";
import { cn } from "@/lib/utils";

export function QuoteSheetForm({
  dealId,
  dealTitle,
  line,
  sheet,
  contact,
  printable = false,
}: {
  dealId: string;
  dealTitle: string;
  line: ShopLine;
  sheet: QuoteSheet;
  contact?: Contact | null;
  printable?: boolean;
}) {
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
    <form action={printable ? undefined : saveQuoteSheet} className="space-y-4">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="line" value={line} />

      <div className="ff-card p-4 print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-navy">
              {SHOP_LINE_LABELS[line]} Quote Sheet
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Fill Quote Sheet is in this product — no bot.{" "}
              <span className="font-medium text-foreground">Copy sheet</span> is the in-desk
              packet ({SUPER_COPY_LABEL}). Pasting into TypTap or any carrier portal stays you
              or a quoting bot. FitFirst does not log into carriers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
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

        <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
          <div className="font-medium text-navy">People live on the Contact</div>
          <p className="mt-0.5 text-muted-foreground">
            Named insured and DOB are not the Quote Sheet source of truth.
            {contactName ? (
              <>
                {" "}
                Contact: <span className="text-foreground">{contactName}</span>
                {contact?.dateOfBirth ? ` · DOB ${contact.dateOfBirth}` : " · DOB not on file"}
              </>
            ) : (
              " No contact yet — shopping starts as a deal."
            )}
          </p>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.group} className="ff-card p-4 print:break-inside-avoid">
          <h3 className="mb-3 text-sm font-semibold text-navy">{group.group}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {printable ? null : (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <CopySheetButton text={copyText} />
          <Button type="submit" size="sm" variant="secondary">
            Save Quote Sheet
          </Button>
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
            Print / PDF
          </Link>
        </div>
      )}
      {printable ? null : (
        <p className="text-[11px] text-muted-foreground print:hidden">{COPY_SHEET_PORTAL_NOTE}</p>
      )}
    </form>
  );
}

function SheetField({
  dealId,
  line,
  fieldKey,
  label,
  cell,
  input = "text",
  readOnly,
}: {
  dealId: string;
  line: ShopLine;
  fieldKey: string;
  label: string;
  cell: QuoteSheetFieldValue;
  input?: "text" | "number" | "textarea";
  readOnly?: boolean;
}) {
  const tone =
    cell.status === "check" ? "check" : cell.value.trim() === "" || cell.status === "missing" ? "missing" : "ok";
  const javy = cell.source === "javy";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label htmlFor={fieldKey} className="text-xs">
          {label}
          {javy ? (
            <span className="ml-1 font-normal text-fit-green">Javy-tested</span>
          ) : cell.status === "check" ? (
            <span className="ml-1 font-normal text-fit-check">CHECK</span>
          ) : null}
        </Label>
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
    </div>
  );
}

function toneClass(tone: "missing" | "check" | "ok") {
  if (tone === "missing") return "ff-field-missing";
  if (tone === "check") return "ff-field-check";
  return "";
}
