import type { Document, ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";
import type { ShopLine } from "@/lib/domain";

export function SourceVsSheet({
  line,
  docs,
  fields,
  values,
}: {
  line: ShopLine;
  docs: Document[];
  fields: ExtractedFieldRow[];
  values: Record<string, QuoteSheetFieldValue>;
}) {
  const sourceDocs = docs.filter((doc) => doc.slot === "source_doc");
  const catalog = fieldsForLine(line);
  const filled = catalog.filter((field) => {
    const cell = values[field.key];
    return cell && cell.value.trim() && cell.status !== "missing";
  });

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-md border border-border p-3">
        <h4 className="text-sm font-semibold text-navy">Source docs (stay on the deal)</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Super-Copy reads the filled Quote Sheet, never these PDFs.
        </p>
        {sourceDocs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No source documents yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {sourceDocs.map((doc) => (
              <li key={doc.id}>
                <span className="font-medium">{doc.filename}</span>
                <span className="ml-2 text-[11px] uppercase text-muted-foreground">
                  {doc.docType.replaceAll("_", " ")} · {doc.status.replaceAll("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
        {fields.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nothing extracted yet.</p>
        ) : (
          <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-xs">
            {fields.slice(0, 24).map((field) => (
              <li key={field.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{field.fieldKey.replaceAll("_", " ")}</span>
                <span className="font-medium">{field.normalizedValue}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-md border border-border p-3">
        <h4 className="text-sm font-semibold text-navy">Master sheet cells</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          {filled.length} filled · yellow missing · blue CHECK. Uncertain stays CHECK — we do not
          invent Cov A from Zillow.
        </p>
        {filled.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Sheet blanks are still empty. Pick the line and Fill master sheet.
          </p>
        ) : (
          <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-xs">
            {filled.map((field) => {
              const cell = values[field.key];
              return (
                <li key={field.key} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{field.label}</span>
                  <span
                    className={
                      cell?.status === "check"
                        ? "font-medium text-fit-check"
                        : cell?.status === "missing"
                          ? "font-medium text-fit-yellow"
                          : "font-medium"
                    }
                  >
                    {cell?.value}{" "}
                    <span className="uppercase text-[10px]">{cell?.status}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
