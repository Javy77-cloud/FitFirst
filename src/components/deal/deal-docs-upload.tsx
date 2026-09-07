"use client";

import { useMemo, useState } from "react";
import { createDealFromUploadSearch } from "@/app/actions/deals-upload";
import { uploadDealDocuments } from "@/app/actions/documents";
import { ChooseFileButton } from "@/components/choose-file-button";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestParties, type PartyHit, type PartyRecord } from "@/lib/crm/party-typeahead";
import { matchDealLookup, suggestDealLookup, type DealLookupRow } from "@/lib/deals/lookup";
import { uploadDealCta, uploadDealCtaLabel } from "@/lib/deals/pipeline-desk";
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
  const cta = uploadDealCta(deals, dealName, dealId || null);
  const primary = rows[0]!;

  return (
    <form action={uploadDealDocuments} className="ff-card space-y-6 p-8" data-testid="deal-docs-upload">
      <div>
        <h2 className="text-xl font-semibold text-navy">Attach documents to a deal</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Search this page, pick a deal, then attach files.</p>
      </div>

      <div>
        <Label htmlFor="dealName" className="text-sm">
          Search deals
        </Label>
        <Input
          id="dealName"
          name="dealName"
          required
          value={dealName}
          onChange={(event) => onNameChange(event.target.value)}
          className="mt-2 h-14"
          placeholder="Type a deal, contact, or business name"
          autoComplete="off"
          aria-label="Search deals"
          data-testid="deal-docs-name"
        />
        <input type="hidden" name="dealId" value={match?.id ?? dealId} />
        <input type="hidden" name="rowCount" value={rows.length} />
      </div>

      {match ? (
        <p className="mt-1 text-sm text-fit-green">
          Will attach to <span className="font-medium">{match.title}</span>
          {match.partyName ? ` · ${match.partyName}` : ""}.
        </p>
      ) : dealName.trim() ? (
        <p className="mt-1 text-sm text-fit-flag">
          No unique Deal match yet. Pick a Contact, Business, or shop below.
        </p>
      ) : null}

      {dealName.trim() && (partySuggestions.length > 0 || dealSuggestions.length > 0) ? (
        <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto rounded-md border border-border bg-card p-1">
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
          {dealSuggestions.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
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
        <ul className="mt-1 space-y-0.5">
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

      <div className="flex flex-wrap items-end gap-3.5">
        <div>
          <Label className="text-sm">Doc type</Label>
          <select
            name="docType_0"
            value={primary.docType}
            onChange={(event) =>
              setRows((current) =>
                current.map((item) => (item.id === primary.id ? { ...item, docType: event.target.value } : item)),
              )
            }
            aria-label="Doc type"
            className="mt-2 h-14 w-[17.6rem] rounded-md border border-input bg-card px-3 text-base"
          >
            {DEAL_UPLOAD_DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOC_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <ChooseFileButton
          name="files_0"
          className="h-14"
          onFile={(file) =>
            setRows((current) =>
              current.map((item) => (item.id === primary.id ? { ...item, fileName: file?.name ?? "" } : item)),
            )
          }
        />
        {primary.fileName ? (
          <FileDeleteIcon
            type="button"
            label={`Remove ${primary.fileName}`}
            onClick={() =>
              setRows((current) =>
                current.map((item) => (item.id === primary.id ? { ...item, fileName: "" } : item)),
              )
            }
          />
        ) : null}
        {cta.kind === "select" && cta.match ? (
          <Button
            type="button"
            className="h-14 px-5 text-base"
            data-testid="deal-select-existing"
            onClick={() => pickDeal(cta.match!)}
          >
            {uploadDealCtaLabel("select")}
          </Button>
        ) : null}
        {cta.kind === "create" ? (
          <Button
            type="submit"
            className="h-14 px-5 text-base"
            formAction={createDealFromUploadSearch}
            data-testid="deal-create-from-search"
          >
            {uploadDealCtaLabel("create")}
          </Button>
        ) : null}
        <Button type="submit" className="h-14 px-5 text-base" disabled={!match}>
          Store on this deal
        </Button>
      </div>

      {rows.slice(1).map((row, extraIndex) => {
        const index = extraIndex + 1;
        return (
          <div key={row.id} className="mt-1 flex flex-wrap items-center gap-3">
            <select
              name={`docType_${index}`}
              value={row.docType}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item) => (item.id === row.id ? { ...item, docType: event.target.value } : item)),
                )
              }
              aria-label="Doc type"
              className="h-14 w-[17.6rem] rounded-md border border-input bg-card px-3 text-base"
            >
              {DEAL_UPLOAD_DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DOC_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <ChooseFileButton
              name={`files_${index}`}
              className="h-14"
              onFile={(file) =>
                setRows((current) =>
                  current.map((item) => (item.id === row.id ? { ...item, fileName: file?.name ?? "" } : item)),
                )
              }
            />
            <FileDeleteIcon
              type="button"
              label={row.fileName ? `Remove ${row.fileName}` : "Remove file row"}
              onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
            />
          </div>
        );
      })}
      <button
        type="button"
        className="mt-1 text-sm font-medium text-primary hover:underline"
        data-testid="deal-add-file"
        onClick={() => {
          setRows((current) => [...current, { id: nextId, docType: "dec", fileName: "" }]);
          setNextId((n) => n + 1);
        }}
      >
        + Add file
      </button>
    </form>
  );
}
