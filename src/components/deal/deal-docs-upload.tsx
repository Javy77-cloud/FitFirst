"use client";

import { useMemo, useState } from "react";
import { uploadDealDocuments } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestParties, type PartyHit, type PartyRecord } from "@/lib/crm/party-typeahead";
import { matchDealLookup, suggestDealLookup, type DealLookupRow } from "@/lib/deals/lookup";
import { DEAL_UPLOAD_DOC_TYPES, DOC_TYPE_LABELS } from "@/lib/domain";

type Row = { id: number; docType: string };

export function DealDocsUpload({
  deals,
  parties,
}: {
  deals: DealLookupRow[];
  parties: PartyRecord[];
}) {
  const [dealName, setDealName] = useState("");
  const [dealId, setDealId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ id: 0, docType: "dec" }]);
  const [nextId, setNextId] = useState(1);

  const match = useMemo(
    () => matchDealLookup(deals, dealName, dealId || null),
    [deals, dealName, dealId],
  );
  const dealSuggestions = useMemo(() => suggestDealLookup(deals, dealName, 8), [deals, dealName]);
  const partySuggestions = useMemo(() => suggestParties(parties, dealName, 8), [parties, dealName]);

  function dealsForParty(hit: PartyHit): DealLookupRow[] {
    return deals.filter((row) =>
      hit.kind === "contact" ? row.contactId === hit.id : row.accountId === hit.id,
    );
  }

  function pickDeal(row: DealLookupRow) {
    setDealId(row.id);
    setDealName(row.partyName || row.title);
  }

  function pickParty(hit: PartyHit) {
    const related = dealsForParty(hit);
    setDealName(hit.title);
    if (related.length === 1) {
      setDealId(related[0]!.id);
    } else {
      setDealId("");
    }
  }

  function onNameChange(value: string) {
    setDealName(value);
    const next = matchDealLookup(deals, value);
    setDealId(next?.id ?? "");
  }

  const relatedFromParty =
    !match && dealName.trim()
      ? partySuggestions.flatMap((hit) => dealsForParty(hit).map((row) => ({ hit, row })))
      : [];

  return (
    <form action={uploadDealDocuments} className="ff-card space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-navy">Upload documents onto a deal</h2>
        <p className="mt-1 text-helper text-muted-foreground">
          Type the Deal name — Contacts and Businesses come up as you type (name, email, or phone).
          Pick one so files attach to that shop.
        </p>
      </div>

      <div>
        <Label htmlFor="dealName" className="text-xs">
          Deal name (person or business)
        </Label>
        <Input
          id="dealName"
          name="dealName"
          required
          value={dealName}
          onChange={(event) => onNameChange(event.target.value)}
          className="mt-1 h-8"
          placeholder="Javy Rivera or Harbor Key Marine"
          autoComplete="off"
          data-testid="deal-docs-name"
        />
        <input type="hidden" name="dealId" value={match?.id ?? dealId} />
        <input type="hidden" name="rowCount" value={rows.length} />
        {match ? (
          <p className="mt-1 text-xs text-fit-green">
            Will attach to <span className="font-medium">{match.title}</span>
            {match.partyName ? ` · ${match.partyName}` : ""}.
          </p>
        ) : dealName.trim() ? (
          <p className="mt-1 text-xs text-fit-flag">
            No unique Deal match yet. Pick a Contact, Business, or shop below — files will not
            store until a Deal is selected.
          </p>
        ) : (
          <p className="mt-1 text-helper text-muted-foreground">Required before files are stored.</p>
        )}
        {dealName.trim() && (partySuggestions.length > 0 || dealSuggestions.length > 0) ? (
          <ul className="mt-2 max-h-52 space-y-1 overflow-auto rounded-md border border-border bg-card p-1">
            {partySuggestions.map((hit) => {
              const related = dealsForParty(hit);
              return (
                <li key={`${hit.kind}-${hit.id}`}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                    onClick={() => pickParty(hit)}
                  >
                    <span>
                      <span className="font-medium text-navy">{hit.title}</span>
                      <span className="ml-2 text-muted-foreground">{hit.subtitle}</span>
                      {related.length === 1 ? (
                        <span className="ml-2 text-fit-green">· {related[0]!.title}</span>
                      ) : related.length > 1 ? (
                        <span className="ml-2 text-muted-foreground">· {related.length} shops</span>
                      ) : (
                        <span className="ml-2 text-muted-foreground">· no shop yet</span>
                      )}
                    </span>
                    <span className="shrink-0 uppercase text-[10px] text-muted-foreground">{hit.kind}</span>
                  </button>
                </li>
              );
            })}
            {dealSuggestions.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                  onClick={() => pickDeal(row)}
                >
                  <span>
                    <span className="font-medium text-primary">{row.title}</span>
                    {row.partyName ? (
                      <span className="ml-2 text-muted-foreground">{row.partyName}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 uppercase text-[10px] text-muted-foreground">deal</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {relatedFromParty.length > 1 && !match ? (
          <ul className="mt-1 space-y-1">
            {relatedFromParty.map(({ row }) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="text-left text-xs text-primary hover:underline"
                  onClick={() => pickDeal(row)}
                >
                  Use shop {row.title}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]"
          >
            <div>
              <Label className="text-xs">Doc type</Label>
              <select
                name={`docType_${index}`}
                defaultValue={row.docType}
                className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                {DEAL_UPLOAD_DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DOC_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">File</Label>
              <input
                name={`files_${index}`}
                type="file"
                multiple
                className="mt-1 block w-full text-xs"
              />
            </div>
            {rows.length > 1 ? (
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                >
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setRows((current) => [...current, { id: nextId, docType: "dec" }]);
            setNextId((n) => n + 1);
          }}
        >
          Add another line
        </Button>
        <Button type="submit" size="sm" disabled={!match}>
          Store on this deal
        </Button>
      </div>
    </form>
  );
}
