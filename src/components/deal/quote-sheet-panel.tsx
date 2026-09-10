import Link from "next/link";
import { addShopLine } from "@/app/actions/quote-sheet";
import { fillQuoteSheetBlanks } from "@/app/actions/lifecycle";
import { Button } from "@/components/ui/button";
import { CopySheetButton } from "@/components/deal/copy-sheet-button";
import { QuoteSheetForm } from "@/components/deal/quote-sheet-form";
import { SendFieldSheetButton } from "@/components/deal/sheet-handoff";
import type { Contact, Document, QuoteSheet } from "@/lib/db/schema";
import {
  SHOP_LINE_LABELS,
  SHOP_LINES,
  isShopLine,
  type ShopLine,
} from "@/lib/domain";
import { buildCopySheetText } from "@/lib/quote-sheet/super-copy";
import {
  COPY_SHEET_HINT,
  FILL_FROM_DOCS_HINT,
  FILL_FROM_DOCS_LABEL,
  SEND_FIELD_SHEET_HINT,
} from "@/lib/quote-sheet/toolbar";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";

export function QuoteSheetPanel({
  dealId,
  dealTitle,
  line,
  shopLines,
  sheet,
  contact,
  riskId,
  sourceDocCount = 0,
  carriers = [],
  docs = [],
}: {
  dealId: string;
  dealTitle: string;
  line: ShopLine;
  shopLines: string[];
  sheet: QuoteSheet;
  contact?: Contact | null;
  riskId?: string;
  sourceDocCount?: number;
  carriers?: { id: string; name: string }[];
  docs?: Document[];
}) {
  const tabs = shopLineTabs(shopLines, line);
  const addable = SHOP_LINES.filter((item) => !tabs.includes(item));
  const contactName = contact ? `${contact.firstName} ${contact.lastName}` : null;
  const copyText = buildCopySheetText({
    line,
    dealId,
    dealTitle,
    values: sheet.values,
    contactName,
    contactDob: contact?.dateOfBirth ?? null,
  });
  const blankSheet = Object.values(sheet.values).every(
    (cell) => !cell.value.trim() || cell.status === "missing",
  );

  return (
    <div className="space-y-4">
      <section className="ff-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-navy">Quote Sheet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Master shopping worksheet for this deal. Edit any field by hand — even with no
              source docs. Fill from docs, Copy sheet, and Send field sheet all read this same
              record.
            </p>
          </div>
        </div>

        <nav aria-label="Quote Sheet lines" className={`mt-4 ${FF_CHIP_TAB_GROUP}`}>
          {tabs.map((item) => {
            const selected = item === line;
            return (
              <Link
                key={item}
                href={`/deals/${dealId}?tab=quote-sheet&line=${item}`}
                scroll={false}
                className={chipTabClass(selected)}
                data-active={selected ? "true" : "false"}
              >
                {SHOP_LINE_LABELS[item]}
              </Link>
            );
          })}
          {addable.length > 0 ? (
            <form action={addShopLine} className="ml-2 flex flex-wrap items-center gap-1">
              <input type="hidden" name="dealId" value={dealId} />
              <label className="sr-only" htmlFor="add-shop-line">
                Add another line
              </label>
              <select
                id="add-shop-line"
                name="line"
                className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                defaultValue={addable[0]}
              >
                {addable.map((item) => (
                  <option key={item} value={item}>
                    {SHOP_LINE_LABELS[item]}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                Add line
              </Button>
            </form>
          ) : null}
        </nav>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-3">
            <form action={fillQuoteSheetBlanks}>
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="line" value={line} />
              <Button type="submit" size="sm" variant="secondary" disabled={sourceDocCount === 0}>
                {FILL_FROM_DOCS_LABEL}
              </Button>
            </form>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {sourceDocCount === 0
                ? "No source docs yet. Use Enter data below, or upload a dec on Documents first."
                : FILL_FROM_DOCS_HINT}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <CopySheetButton text={copyText} />
            <p className="mt-1.5 text-xs text-muted-foreground">{COPY_SHEET_HINT}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <SendFieldSheetButton dealId={dealId} line={line} />
            <p className="mt-1.5 text-xs text-muted-foreground">{SEND_FIELD_SHEET_HINT}</p>
          </div>
        </div>
      </section>

      <QuoteSheetForm
        dealId={dealId}
        dealTitle={dealTitle}
        line={line}
        sheet={sheet}
        contact={contact}
        riskId={riskId}
        sourceDocCount={sourceDocCount}
        startEditing={sourceDocCount === 0 && blankSheet}
        carriers={carriers}
        docs={docs}
      />
    </div>
  );
}

function shopLineTabs(shopLines: string[], active: ShopLine): ShopLine[] {
  const lines: ShopLine[] = [];
  for (const item of ["home", ...shopLines, active]) {
    if (isShopLine(item) && !lines.includes(item)) lines.push(item);
  }
  return lines;
}
