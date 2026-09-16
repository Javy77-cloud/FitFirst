import { quotesBindableSignal } from "@/lib/deals/quotes-bindable-signal";
import { cn } from "@/lib/utils";

export function QuotesBindableSignal({
  quotes,
}: {
  quotes: readonly {
    bindable?: boolean | null;
    riskOutcome?: string | null;
    nextStep?: string | null;
    premium?: string | number | null;
    stub?: boolean | null;
  }[];
}) {
  const signal = quotesBindableSignal(quotes);
  if (signal.tone === "empty") return null;
  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-sm font-semibold",
        signal.tone === "green" && "border-fit-green/40 bg-fit-green-bg text-fit-green",
        signal.tone === "amber" && "border-fit-yellow/40 bg-fit-yellow-bg text-fit-yellow",
        signal.tone === "red" && "border-fit-flag/40 bg-fit-red-bg text-fit-flag",
      )}
      data-ff-quotes-bindable-signal={signal.tone}
      data-ff-quotes-bindable-count={signal.bindableCount}
    >
      {signal.label}
    </p>
  );
}
