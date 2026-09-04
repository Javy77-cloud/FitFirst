import Link from "next/link";
import { fillQuoteSheetBlanks } from "@/app/actions/lifecycle";
import { DeskDetails } from "@/components/desk-details";
import { Button, buttonVariants } from "@/components/ui/button";
import type { QuoteSheetFieldValue } from "@/lib/domain";
import { SHOP_LINE_LABELS, type ShopLine } from "@/lib/domain";
import { groupFields } from "@/lib/quote-sheet/catalog";
import { sheetGroupNeedsAttention, sheetGroupSummary } from "@/lib/quotes/collapse";
import { quotingFormById } from "@/lib/quoting/forms";
import { cn } from "@/lib/utils";
import { QuoteHandoff } from "./quote-handoff";
import { SheetApproveGate } from "./sheet-approve-gate";

export function QuoteSheetPanel({
  dealId,
  values,
  line = "home",
  quotingForm,
  unlocked,
  approvedBy,
  sheetLines = [],
}: {
  dealId: string;
  values: Record<string, QuoteSheetFieldValue> | null;
  line?: string;
  quotingForm?: string | null;
  unlocked: boolean;
  approvedBy?: string | null;
  sheetLines?: string[];
}) {
  const sheet = values ?? {};
  const shopLine = (line as ShopLine) ?? "home";
  const groups = groupFields(shopLine);
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
              Visual approval unlocks quoting. Super-Copy, Send to Fill, and Forms Fill all read
              this same <code>quote_sheets</code> record — never the raw PDFs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={fillQuoteSheetBlanks}>
              <input type="hidden" name="dealId" value={dealId} />
              <input type="hidden" name="line" value={shopLine} />
              <Button type="submit" size="sm">
                Fill blanks from source docs
              </Button>
            </form>
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

      {groups.map((group) => (
        <DeskDetails
          key={group.group}
          title={group.group}
          summary={sheetGroupSummary(group.fields, sheet)}
          open={sheetGroupNeedsAttention(group.fields, sheet)}
          padded={false}
        >
          <table className="ff-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {group.fields.map((field) => {
                const cell = sheet[field.key];
                const status = cell?.status ?? "missing";
                return (
                  <tr
                    key={field.key}
                    className={
                      status === "missing"
                        ? "bg-fit-yellow-bg/60"
                        : status === "check"
                          ? "bg-fit-check-bg/70"
                          : ""
                    }
                  >
                    <td className="font-medium">{field.label}</td>
                    <td>{cell?.value || "—"}</td>
                    <td className="uppercase text-[11px]">
                      {status}
                      {cell?.source && cell.source !== "blank" ? ` · ${cell.source}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DeskDetails>
      ))}
    </div>
  );
}
