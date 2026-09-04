import Link from "next/link";
import { fillQuoteSheetBlanks } from "@/app/actions/lifecycle";
import { buttonVariants } from "@/components/ui/button";
import type { Contact, QuoteSheet, QuoteSheetFieldValue } from "@/lib/db/schema";
import { SHOP_LINE_LABELS, type ShopLine } from "@/lib/domain";
import { quotingFormById } from "@/lib/quoting/forms";
import { cn } from "@/lib/utils";
import { QuoteHandoff } from "./quote-handoff";
import { SheetApproveGate } from "./sheet-approve-gate";
import { QuoteSheetForm } from "./quote-sheet-form";
import { FillSubmitButton } from "./fill-progress";

export function QuoteSheetPanel({
  dealId,
  dealTitle,
  values,
  line = "home",
  quotingForm,
  unlocked,
  approvedBy,
  sheetLines = [],
  sheet,
  contact,
  riskId,
  carriers = [],
}: {
  dealId: string;
  dealTitle?: string;
  values: Record<string, QuoteSheetFieldValue> | null;
  line?: string;
  quotingForm?: string | null;
  unlocked: boolean;
  approvedBy?: string | null;
  sheetLines?: string[];
  sheet?: QuoteSheet | null;
  contact?: Contact | null;
  riskId?: string;
  carriers?: { id: string; name: string }[];
}) {
  const cells = values ?? {};
  const shopLine = (line as ShopLine) ?? "home";
  const form = quotingFormById(quotingForm ?? "");
  const formLabel = form?.label ?? SHOP_LINE_LABELS[shopLine] ?? "Master sheet";
  const lines = sheetLines.length > 0 ? sheetLines : [shopLine];

  return (
    <div className="space-y-4">
      <section className="ff-card space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-navy">{formLabel} master sheet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Glance yellow missing / blue CHECK, approve, then Send to Fill. Super-Copy, Send
              master sheet to Fill, and Forms Fill all read this same <code>quote_sheets</code>{" "}
              record — zero rekey, never the raw PDFs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={fillQuoteSheetBlanks}>
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="line" value={shopLine} />
              <FillSubmitButton
                label="Fill blanks from source docs"
                pendingLabel="Reading source docs…"
              />
            </form>
            <Link href="/quotes/fill-feedback" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Fill Feedback log
            </Link>
            <Link
              href={`/api/deals/${dealId}/quote-sheets/${shopLine}/super-copy`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Super-Copy JSON
            </Link>
            {shopLine === "home" ? (
              <Link
                href={`/forms/fl-ho3?dealId=${dealId}`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                Forms Fill
              </Link>
            ) : null}
          </div>
        </div>

        {lines.length > 1 ? (
          <div className="flex flex-wrap gap-1">
            {lines.map((item) => (
              <Link
                key={item}
                href={`/deals/${dealId}?tab=quote-sheet&line=${item}`}
                className={cn(
                  "rounded-sm px-2 py-1 text-xs font-medium",
                  item === shopLine ? "bg-primary text-primary-foreground" : "bg-secondary text-navy",
                )}
              >
                {SHOP_LINE_LABELS[item as ShopLine] ?? item}
                {item !== shopLine && (quotingForm === "HO3" || !quotingForm) ? " · prepared" : ""}
              </Link>
            ))}
          </div>
        ) : null}

        <SheetApproveGate
          dealId={dealId}
          line={shopLine}
          formLabel={formLabel}
          unlocked={unlocked}
          approvedBy={approvedBy}
        />
        <QuoteHandoff dealId={dealId} line={shopLine} formLabel={formLabel} unlocked={unlocked} />
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-sm bg-fit-yellow-bg px-1.5 py-0.5 text-fit-yellow">Missing</span>
          <span className="rounded-sm bg-fit-check-bg px-1.5 py-0.5 text-fit-check">CHECK</span>
          <span className="rounded-sm bg-fit-green-bg px-1.5 py-0.5 text-fit-green">Confirmed</span>
        </div>
      </section>

      {sheet ? (
        <QuoteSheetForm
          dealId={dealId}
          dealTitle={dealTitle ?? formLabel}
          line={shopLine}
          sheet={sheet}
          contact={contact}
          riskId={riskId}
          carriers={carriers}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No Quote Sheet row yet. Upload a source doc and pick the line to build one. {Object.keys(cells).length} preview cells.
        </p>
      )}
    </div>
  );
}
