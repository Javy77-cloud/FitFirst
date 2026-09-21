import type { AutoQuestionGapList } from "@/lib/quote-bot/auto-question-gaps";
import { AUTO_QUESTION_GAPS_RELATIVE_PATH } from "@/lib/quote-bot/auto-question-gaps";

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function AutoQuestionGapsPanel({ list }: { list: AutoQuestionGapList }) {
  return (
    <div data-ff-auto-question-gaps="">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Running list of Auto carrier questions that are not on the Auto risk profile. The file is{" "}
        <code className="text-xs">{AUTO_QUESTION_GAPS_RELATIVE_PATH}</code>. Similar wording shares
        one row: the count goes up and answer choices are combined. The most common phrasing is
        listed first. This view does not add risk-profile fields.
      </p>
      {list.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-ff-auto-question-gaps-empty="">
          Nothing logged yet. A quote pull logs a question here when the carrier asks for something
          the Auto risk profile does not already have.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Auto carrier questions missing from the risk profile</caption>
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-2 py-2 font-medium">Question</th>
                <th scope="col" className="px-2 py-2 font-medium">Count</th>
                <th scope="col" className="px-2 py-2 font-medium">Carriers</th>
                <th scope="col" className="px-2 py-2 font-medium">Answer choices</th>
                <th scope="col" className="px-2 py-2 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {list.entries.map((row) => (
                <tr key={row.id} className="border-t border-border align-top" data-ff-auto-gap={row.id}>
                  <td className="px-2 py-3">
                    <div className="font-medium text-navy">{row.canonicalQuestion}</div>
                    {row.phrasings.length > 1 ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {row.phrasings.slice(1).map((phrasing) => (
                          <li key={phrasing.text}>
                            {phrasing.text} ({phrasing.count})
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="px-2 py-3 tabular-nums">{row.count}</td>
                  <td className="px-2 py-3">
                    {row.carriers.map((carrier) => (
                      <div key={`${carrier.carrierId ?? ""}-${carrier.carrierName}`}>
                        {carrier.carrierName}
                        <span className="text-muted-foreground"> · {carrier.count}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-2 py-3">
                    {row.options.length > 0 ? row.options.join(", ") : null}
                    {row.optionsNote ? (
                      <div className="text-xs text-muted-foreground">{row.optionsNote}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                    {formatWhen(row.lastSeenAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
