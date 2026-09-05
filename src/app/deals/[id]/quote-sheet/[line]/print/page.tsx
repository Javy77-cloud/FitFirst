import { notFound } from "next/navigation";
import { QuoteSheetForm } from "@/components/deal/quote-sheet-form";
import { getDealWorkspace } from "@/lib/db/queries";
import { SHOP_LINES, type ShopLine } from "@/lib/domain";
import { SUPER_COPY_LABEL } from "@/lib/quote-sheet/super-copy";

export const dynamic = "force-dynamic";

export default async function QuoteSheetPrintPage({
  params,
}: {
  params: Promise<{ id: string; line: string }>;
}) {
  const { id, line } = await params;
  if (!(SHOP_LINES as readonly string[]).includes(line)) notFound();
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();
  const sheet =
    workspace.sheets.find((row) => row.line === line) ?? workspace.quoteSheet;
  if (!sheet) notFound();

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 print:p-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy">
        FitFirst Super-Copy · {SUPER_COPY_LABEL}
      </p>
      <h1 className="text-xl font-semibold text-navy">{workspace.deal.title}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Print or save as PDF. This sheet is the packet. Source PDFs stay on Files. Fill is
        in FitFirst. Portal paste is you or a bot — no carrier login here.
      </p>
      <QuoteSheetForm
        dealId={workspace.deal.id}
        dealTitle={workspace.deal.title}
        line={line as ShopLine}
        sheet={sheet}
        contact={workspace.contact}
        printable
      />
    </div>
  );
}
