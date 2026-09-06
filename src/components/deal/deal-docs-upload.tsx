"use client";

import { useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { uploadDealDocuments } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestParties, type PartyHit, type PartyRecord } from "@/lib/crm/party-typeahead";
import { matchDealLookup, suggestDealLookup, type DealLookupRow } from "@/lib/deals/lookup";
import { DEAL_UPLOAD_DOC_TYPES, DOC_TYPE_LABELS } from "@/lib/domain";
import { setLiveQuery } from "@/lib/search/live-query";

type Row = { id: number; docType: string; fileName: string };

export function DealDocsUpload({
  deals,
  parties,
}: {
  deals: DealLookupRow[];
  parties: PartyRecord[];
}) {
  const [dealName, setDealName] = useState("");
  const [dealId, setDealId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ id: 0, docType: "dec", fileName: "" }]);
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

  function filterPage(value: string) {
    setLiveQuery("deals", value);
  }

  function pickDeal(row: DealLookupRow) {
    setDealId(row.id);
    setDealName(row.partyName || row.title);
    filterPage(row.partyName || row.title);
  }

  function pickParty(hit: PartyHit) {
    const related = dealsForParty(hit);
    setDealName(hit.title);
    filterPage(hit.title);
    if (related.length === 1) {
      setDealId(related[0]!.id);
    } else {
      setDealId("");
    }
  }

  function onNameChange(value: string) {
    setDealName(value);
    filterPage(value);
    const next = matchDealLookup(deals, value);
    setDealId(next?.id ?? "");
  }

  const relatedFromParty =
    !match && dealName.trim()
      ? partySuggestions.flatMap((hit) => dealsForParty(hit).map((row) => ({ hit, row })))
      : [];

  return (
    <form action={uploadDealDocuments} className="ff-card space-y-3 p-4" data-testid="deal-docs-upload">
      <div>
        <h2 className="text-sm font-semibold text-navy">Upload documents onto a deal</h2>
        <p className="mt-1 text-helper text-muted-foreground">
          Search deals on this page, pick one, then attach files. This is not global search.
        </p>
      </div>

      <div>
        <Label htmlFor="dealName" className="text-xs">
          Search deals
        </Label>
        <Input
          id="dealName"
          name="dealName"
          required
          value={dealName}
          onChange={(event) => onNameChange(event.target.value)}
          className="mt-1 h-8"
          placeholder="Type a deal, contact, or business name"
          autoComplete="off"
          aria-label="Search deals"
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
          <FilePickRow
            key={row.id}
            row={row}
            index={index}
            onFileName={(fileName) =>
              setRows((current) =>
                current.map((item) => (item.id === row.id ? { ...item, fileName } : item)),
              )
            }
            onDocType={(docType) =>
              setRows((current) =>
                current.map((item) => (item.id === row.id ? { ...item, docType } : item)),
              )
            }
            onRemove={() => {
              setRows((current) => {
                const next = current.filter((item) => item.id !== row.id);
                return next.length > 0 ? next : [{ id: row.id, docType: "dec", fileName: "" }];
              });
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          data-testid="deal-add-file"
          onClick={() => {
            setRows((current) => [...current, { id: nextId, docType: "dec", fileName: "" }]);
            setNextId((n) => n + 1);
          }}
        >
          + Add file
        </button>
        <Button type="submit" size="sm" disabled={!match}>
          Store on this deal
        </Button>
      </div>
    </form>
  );
}

function FilePickRow({
  row,
  index,
  onFileName,
  onDocType,
  onRemove,
}: {
  row: Row;
  index: number;
  onFileName: (fileName: string) => void;
  onDocType: (docType: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
      <div>
        <Label className="text-xs">Doc type</Label>
        <select
          name={`docType_${index}`}
          value={row.docType}
          onChange={(event) => onDocType(event.target.value)}
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
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            name={`files_${index}`}
            type="file"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              onFileName(file?.name ?? "");
            }}
          />
          <Button
            type="button"
            size="sm"
            data-testid={index === 0 ? "deal-choose-file" : undefined}
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </Button>
          {row.fileName ? (
            <span className="inline-flex items-center gap-1 text-xs text-navy">
              <span className="max-w-[14rem] truncate">{row.fileName}</span>
              <button
                type="button"
                aria-label={`Remove ${row.fileName}`}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-fit-flag"
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = "";
                  onRemove();
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
