import { formatMoney } from "@/lib/domain";
import type { ComparedQuote } from "@/lib/quotes/gap-notes";
import { cn } from "@/lib/utils";

export function CompareTable({ quotes }: { quotes: ComparedQuote[] }) {
  if (quotes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No quotes on this deal yet. Log a quoted result or build stub quotes, then compare.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto md:block">
        <table className="ff-table min-w-[640px]">
          <thead>
            <tr>
              <th className="w-36">Coverage</th>
              {quotes.map((quote) => (
                <th key={quote.id}>
                  {quote.carrierName}
                  {quote.cheapest ? (
                    <div className="text-[11px] font-normal text-fit-green">Lowest premium</div>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-xs text-muted-foreground">Premium</td>
              {quotes.map((quote) => (
                <td key={quote.id} className={cn("font-semibold", quote.cheapest && "text-fit-green")}>
                  {formatMoney(quote.premium)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="text-xs text-muted-foreground">AOP deductible</td>
              {quotes.map((quote) => (
                <td key={quote.id}>{quote.aopDeductible ?? "—"}</td>
              ))}
            </tr>
            <tr>
              <td className="text-xs text-muted-foreground">Hurricane deductible</td>
              {quotes.map((quote) => (
                <td key={quote.id}>{quote.hurricaneDeductible ?? "—"}</td>
              ))}
            </tr>
            <tr>
              <td className="text-xs text-muted-foreground">Coverage A</td>
              {quotes.map((quote) => (
                <td key={quote.id}>{formatMoney(quote.coverageA)}</td>
              ))}
            </tr>
            <tr>
              <td className="text-xs text-muted-foreground">Flood</td>
              {quotes.map((quote) => (
                <td key={quote.id}>{quote.includesFlood ? "Included" : "No flood"}</td>
              ))}
            </tr>
            <tr>
              <td className="text-xs text-muted-foreground">Bindable</td>
              {quotes.map((quote) => (
                <td key={quote.id}>{quote.bindable ? "Yes" : "No"}</td>
              ))}
            </tr>
            <tr>
              <td className="align-top text-xs text-muted-foreground">Gap notes</td>
              {quotes.map((quote) => (
                <td key={quote.id} className="align-top">
                  <GapList notes={quote.notesPlain} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {quotes.map((quote) => (
          <article key={quote.id} className="ff-card p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-navy">{quote.carrierName}</h3>
              <span className={cn("text-sm font-semibold", quote.cheapest && "text-fit-green")}>
                {formatMoney(quote.premium)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              AOP {quote.aopDeductible ?? "—"} · Hurricane {quote.hurricaneDeductible ?? "—"} · Cov A{" "}
              {formatMoney(quote.coverageA)} · {quote.includesFlood ? "Flood included" : "No flood"}
            </p>
            <div className="mt-2">
              <GapList notes={quote.notesPlain} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function GapList({ notes }: { notes: ComparedQuote["notesPlain"] }) {
  if (notes.length === 0) {
    return <p className="text-xs text-fit-green">No coverage gaps noted against this set.</p>;
  }
  return (
    <ul className="space-y-1">
      {notes.map((note) => (
        <li
          key={`${note.code}-${note.text}`}
          className={cn(
            "text-xs",
            note.severity === "gap" && "text-fit-red",
            note.severity === "watch" && "text-fit-yellow",
            note.severity === "better" && "text-fit-green",
          )}
        >
          {note.text}
        </li>
      ))}
    </ul>
  );
}
