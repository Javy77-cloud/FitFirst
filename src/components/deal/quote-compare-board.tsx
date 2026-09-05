"use client";

import { useMemo, useState } from "react";
import { generateBrandedProposal, saveVideoProposalUrl } from "@/app/actions/proposal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/domain";
import type { CompareQuote } from "@/lib/quotes/compare";
import { defaultSelectedIds, diffQuotes, plainEnglishLines } from "@/lib/quotes/compare";
import { videoProposalHost } from "@/lib/quotes/video-proposal";

export function QuoteCompareBoard({
  dealId,
  dealTitle,
  quotes,
  initialSelectedIds,
  videoProposalUrl,
  proposals,
}: {
  dealId: string;
  dealTitle: string;
  quotes: CompareQuote[];
  initialSelectedIds?: string[];
  videoProposalUrl?: string | null;
  proposals: { id: string; filename: string; href: string }[];
}) {
  const [selected, setSelected] = useState<string[]>(() => {
    if (initialSelectedIds?.length) return initialSelectedIds;
    return defaultSelectedIds(quotes);
  });

  const picked = useMemo(
    () => quotes.filter((row) => selected.includes(row.id)),
    [quotes, selected],
  );
  const diffs = useMemo(() => diffQuotes(picked), [picked]);
  const english = useMemo(() => plainEnglishLines(picked), [picked]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  if (quotes.length === 0) {
    return (
      <section className="ff-card px-4 py-8 text-sm text-muted-foreground">
        No quotes or priced attempts on {dealTitle} yet. Filter markets, log the shop, then come
        back to compare. A quote never becomes a policy.
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="ff-card overflow-x-auto p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-navy">Select quotes</h2>
          <p className="text-helper text-muted-foreground">
            Tick two or more. Diffs and the plain-English note update as you pick.
          </p>
        </div>
        <table className="ff-table">
          <thead>
            <tr>
              <th className="w-10">Use</th>
              <th>Carrier</th>
              <th>Premium</th>
              <th>Cov A</th>
              <th>AOP</th>
              <th>Hurricane</th>
              <th>Bindable</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((row) => (
              <tr key={row.id} className={selected.includes(row.id) ? "bg-fit-check-bg/40" : undefined}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`Compare ${row.carrierName}`}
                  />
                </td>
                <td className="font-medium">
                  {row.carrierName}
                  {row.source === "attempt" ? (
                    <div className="text-helper text-muted-foreground">From attempt log</div>
                  ) : null}
                </td>
                <td>{formatMoney(row.premium)}</td>
                <td>{formatMoney(row.coverageA)}</td>
                <td>{row.aopDeductible ?? "—"}</td>
                <td>{row.hurricaneDeductible ?? "—"}</td>
                <td>{row.bindable ? "Yes" : "No"}</td>
                <td className="text-xs capitalize">{row.result?.replaceAll("_", " ") ?? "quoted"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ff-card overflow-x-auto p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-navy">Differences</h2>
          <p className="text-helper text-muted-foreground">
            Highlighted rows differ across the quotes you selected.
          </p>
        </div>
        {picked.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Select at least one quote.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Field</th>
                {picked.map((row) => (
                  <th key={row.id}>{row.carrierName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diffs.map((diff) => (
                <tr key={diff.key} className={diff.same ? undefined : "bg-fit-yellow-bg/70"}>
                  <td className="font-medium">{diff.label}</td>
                  {picked.map((row) => (
                    <td key={row.id}>{diff.values[row.id]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">In plain English</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
          {english.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">Branded PDF proposal</h2>
        <p className="mb-3 text-helper text-muted-foreground">
          Agency letterhead, the selected quotes, the diffs, and the plain-English note. Stored on
          this deal. Not a policy.
        </p>
        <form action={generateBrandedProposal} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="dealId" value={dealId} />
          {selected.map((id) => (
            <input key={id} type="hidden" name="quoteId" value={id} />
          ))}
          <Button type="submit" size="sm" disabled={selected.length === 0}>
            Generate branded proposal
          </Button>
        </form>
        {proposals.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {proposals.map((doc) => (
              <li key={doc.id}>
                <a href={doc.href} className="text-primary hover:underline">
                  {doc.filename}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-helper text-muted-foreground">No proposal PDF on this deal yet.</p>
        )}
      </section>

      <section className="ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">Video proposal</h2>
        <p className="mb-3 text-helper text-muted-foreground">
          Record or upload a walkthrough on your own host (Drive, Vimeo, YouTube, Zoom cloud). Paste
          the link here. FitFirst does not record video and does not call Loom.
        </p>
        {videoProposalUrl ? (
          <p className="mb-3 text-sm">
            Saved:{" "}
            <a href={videoProposalUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
              {videoProposalHost(videoProposalUrl) ?? "Open video"}
            </a>
          </p>
        ) : (
          <p className="mb-3 text-sm text-muted-foreground">No video link on this deal.</p>
        )}
        <form action={saveVideoProposalUrl} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="dealId" value={dealId} />
          <label className="min-w-[16rem] flex-1 text-xs">
            Record / upload link
            <Input
              name="videoProposalUrl"
              type="url"
              placeholder="https://…"
              defaultValue={videoProposalUrl ?? ""}
              className="mt-1"
            />
          </label>
          <Button type="submit" size="sm">
            Save link on deal
          </Button>
        </form>
        {videoProposalUrl ? (
          <form action={saveVideoProposalUrl} className="mt-2">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="clear" value="1" />
            <input type="hidden" name="videoProposalUrl" value="" />
            <Button type="submit" size="sm" variant="outline">
              Clear
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
