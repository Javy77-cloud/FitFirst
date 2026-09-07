import type { ExtractedFieldRow, QuoteSheetFieldValue } from "@/lib/db/schema";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";
import type { ShopLine } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function MasterSheetCompare({
  line,
  fields,
  values,
}: {
  line: ShopLine;
  fields: ExtractedFieldRow[];
  values: Record<string, QuoteSheetFieldValue>;
}) {
  const catalog = fieldsForLine(line);
  const extractedByKey = new Map(fields.map((field) => [field.fieldKey, field]));

  return (
    <section className="ff-card overflow-hidden" data-ff-master-sheet-compare>
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-navy">Master sheet</h3>
        <p className="text-helper text-muted-foreground">
          Empty before extraction. Filled after. Confirm every value before quotes.
        </p>
      </div>
      <div className="max-h-[32rem] overflow-auto">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Before</th>
              <th>After</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((field) => {
              const extracted =
                extractedByKey.get(field.key) ??
                extractedByKey.get(field.extractKey ?? "");
              const cell = values[field.key];
              const filled = Boolean(cell?.value.trim() && cell.status !== "missing");
              return (
                <tr key={field.key} id={`sheet-field-${field.key}`}>
                  <td className="font-medium">{field.label}</td>
                  <td className="text-muted-foreground">
                    {extracted?.normalizedValue || extracted?.rawValue || "—"}
                  </td>
                  <td
                    className={cn(
                      cell?.status === "check" && "text-fit-check",
                      cell?.status === "missing" && "text-fit-yellow",
                      cell?.status === "confirmed" && filled && "text-fit-green",
                    )}
                  >
                    {filled ? cell?.value : "—"}
                    {cell?.status && filled ? (
                      <span className="ml-1 text-[10px] uppercase">{cell.status}</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
