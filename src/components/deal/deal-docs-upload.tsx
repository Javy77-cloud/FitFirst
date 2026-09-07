"use client";

import { useMemo, useState } from "react";
import { createDealFromUploadSearch } from "@/app/actions/deals-upload";
import { uploadDealDocuments } from "@/app/actions/documents";
import { ChooseFileButton } from "@/components/choose-file-button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestParties, type PartyHit, type PartyRecord } from "@/lib/crm/party-typeahead";
import { matchDealLookup, suggestDealLookup, type DealLookupRow } from "@/lib/deals/lookup";
import { uploadDealCta, uploadDealCtaLabel } from "@/lib/deals/pipeline-desk";
import { DEAL_UPLOAD_DOC_TYPES, DOC_TYPE_LABELS } from "@/lib/domain";
import { setLiveQuery } from "@/lib/search/live-query";

type Row = { id: number; docType: string; fileName: string; pick: number };

function emptyRow(id: number): Row {
  return { id, docType: "dec", fileName: "", pick: 0 };
}

export function DealDocsUpload({
  deals,
  parties,
}: {
  deals: DealLookupRow[];
  parties: PartyRecord[];
}) {
  const [dealName, setDealName] = useState("");
  const [dealId, setDealId] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow(0)]);
  const [nextId, setNextId] = useState(1);

  const match = useMemo(
    () => matchDealLookup(deals, dealName, dealId || null),
    [deals, dealName, dealId],
  );
  const dealSuggestions = useMemo(() => suggestDealLookup(deals, dealName, 8), [deals, dealName]);
  const partySuggestions = useMemo(() => suggestParties(parties, dealName, 8), [parties, dealName]);

  function dealsForParty(hit: PartyHit): DealLookupRow[] {
    return deals.filter((item) =>
      hit.kind === "contact" ? item.contactId === hit.id : item.accountId === hit.id,
    );
  }

  function filterPage(value: string) {
    setLiveQuery("deals", value);
  }

  function pickDeal(picked: DealLookupRow) {
    setDealId(picked.id);
    setDealName(picked.partyName || picked.title);
    filterPage(picked.partyName || picked.title);
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

  function patchRow(id: number, patch: Partial<Row>) {
    setRows((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeRow(id: number) {
    setRows((current) => {
      if (current.length === 1) {
        return current.map((item) =>
          item.id === id ? { ...item, fileName: "", pick: item.pick + 1 } : item,
        );
      }
      return current.filter((item) => item.id !== id);
    });
  }

  const relatedFromParty =
    !match && dealName.trim()
      ? partySuggestions.flatMap((hit) => dealsForParty(hit).map((item) => ({ hit, row: item })))
      : [];
  const cta = uploadDealCta(deals, dealName, dealId || null);

  return (
    <form
      action={uploadDealDocuments}
      className="ff-card relative flex h-[120px] flex-col justify-center gap-1 px-3 py-2"
      data-testid="deal-docs-upload"
    >
      <h2 className="text-sm font-semibold text-navy">Attach documents to a deal</h2>
      <div className="flex flex-nowrap items-center gap-2">
        <Input
          id="dealName"
          name="dealName"
          required
          value={dealName}
          onChange={(event) => onNameChange(event.target.value)}
          className="h-8 min-w-[10rem] flex-1"
          placeholder="Search deals"
          autoComplete="off"
          aria-label="Search deals"
          data-testid="deal-docs-name"
        />
        <input type="hidden" name="dealId" value={match?.id ?? dealId} />
        <input type="hidden" name="rowCount" value={rows.length} />
        {cta.kind === "select" && cta.match ? (
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0"
            data-testid="deal-select-existing"
            onClick={() => pickDeal(cta.match!)}
          >
            {uploadDealCtaLabel("select")}
          </Button>
        ) : null}
        {cta.kind === "create" ? (
          <Button
            type="submit"
            size="sm"
            className="h-8 shrink-0"
            formAction={createDealFromUploadSearch}
            data-testid="deal-create-from-search"
          >
            {uploadDealCtaLabel("create")}
          </Button>
        ) : null}
        <Button type="submit" size="sm" className="h-8 shrink-0" disabled={!match}>
          Store on this deal
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {rows.map((row, index) => (
          <div key={row.id} className="flex flex-nowrap items-center gap-2">
            <select
              name={`docType_${index}`}
              value={row.docType}
              onChange={(event) => patchRow(row.id, { docType: event.target.value })}
              aria-label="Doc type"
              className="h-8 w-[10rem] shrink-0 rounded-md border border-input bg-card px-2 text-sm"
            >
              {DEAL_UPLOAD_DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DOC_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <ChooseFileButton
              key={`${row.id}-${row.pick}`}
              name={`files_${index}`}
              keepLabel
              className="h-8 shrink-0"
              onFile={(file) => patchRow(row.id, { fileName: file?.name ?? "" })}
            />
            {row.fileName ? (
              <span className="min-w-0 truncate text-sm text-navy" data-testid="deal-doc-filename">
                {row.fileName}
              </span>
            ) : null}
            <FileDeleteIcon
              type="button"
              label={row.fileName ? `Remove ${row.fileName}` : "Remove file row"}
              onClick={() => removeRow(row.id)}
            />
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          data-testid="deal-add-document"
          onClick={() => {
            setRows((current) => [...current, emptyRow(nextId)]);
            setNextId((n) => n + 1);
          }}
        >
          + Add another document
        </button>
      </div>

      {match ? (
        <p className="sr-only">
          Will attach to {match.title}
          {match.partyName ? ` · ${match.partyName}` : ""}.
        </p>
      ) : dealName.trim() ? (
        <p className="sr-only">No unique Deal match yet. Pick a Contact, Business, or shop below.</p>
      ) : null}

      {dealName.trim() && (partySuggestions.length > 0 || dealSuggestions.length > 0) ? (
        <ul className="absolute left-3 right-3 top-full z-20 mt-1 max-h-40 space-y-0.5 overflow-auto rounded-md border border-border bg-card p-1">
          {partySuggestions.map((hit) => {
            const related = dealsForParty(hit);
            return (
              <li key={`${hit.kind}-${hit.id}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
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
          {dealSuggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => pickDeal(item)}
              >
                <span>
                  <span className="font-medium text-primary">{item.title}</span>
                  {item.partyName ? (
                    <span className="ml-2 text-muted-foreground">{item.partyName}</span>
                  ) : null}
                </span>
                <span className="shrink-0 uppercase text-[10px] text-muted-foreground">deal</span>
              </button>
            </li>
          ))}
          {relatedFromParty.length > 1 && !match
            ? relatedFromParty.map(({ row: shop }) => (
                <li key={`shop-${shop.id}`}>
                  <button
                    type="button"
                    className="w-full text-left text-xs text-primary hover:underline"
                    onClick={() => pickDeal(shop)}
                  >
                    Use shop {shop.title}
                  </button>
                </li>
              ))
            : null}
        </ul>
      ) : null}
    </form>
  );
}
