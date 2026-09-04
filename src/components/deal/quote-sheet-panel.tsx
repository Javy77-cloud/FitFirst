import Link from "next/link";
import { fillQuoteSheetBlanks } from "@/app/actions/lifecycle";
import { Button, buttonVariants } from "@/components/ui/button";
import type { QuoteSheetFieldValue } from "@/lib/domain";
import { groupHomeFields } from "@/lib/lifecycle/quote-sheet";
import { cn } from "@/lib/utils";
import { SheetHandoffButtons } from "./sheet-handoff";

export function QuoteSheetPanel({
  dealId,
  values,
  line = "home",
}: {
  dealId: string;
  values: Record<string, QuoteSheetFieldValue> | null;
  line?: string;
}) {
  const sheet = values ?? {};
  const groups = groupHomeFields();

  return (
    <div className="space-y-4">
      <section className="ff-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-navy">Quote Sheet</h3>
            <p className="mt-1 text-base text-muted-foreground">
              Master shopping worksheet. Yellow is missing. Blue is CHECK. Super-Copy, Send to
              Fill, and Forms Fill all read this same <code>quote_sheets</code> record — never the
              raw PDFs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={fillQuoteSheetBlanks}>
              <input type="hidden" name="dealId" value={dealId} />
              <Button type="submit" size="sm">
                Fill blanks from source docs
              </Button>
            </form>
            <Link
              href={`/api/deals/${dealId}/quote-sheets/${line}/super-copy`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Super-Copy JSON
            </Link>
            <Link
              href={`/forms/fl-ho3?dealId=${dealId}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Forms Fill
            </Link>
          </div>
        </div>
        <SheetHandoffButtons dealId={dealId} line={line} />
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-sm bg-fit-yellow-bg px-1.5 py-0.5 text-fit-yellow">Missing</span>
          <span className="rounded-sm bg-fit-check-bg px-1.5 py-0.5 text-fit-check">CHECK</span>
          <span className="rounded-sm bg-fit-green-bg px-1.5 py-0.5 text-fit-green">Confirmed</span>
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.group} className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
            {group.group}
          </div>
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
        </section>
      ))}
    </div>
  );
}
