"use client";

import { useMemo, useState } from "react";
import { uploadDealDocuments } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEAL_UPLOAD_DOC_TYPES, DOC_TYPE_LABELS } from "@/lib/domain";
import { matchDealLookup, suggestDealLookup, type DealLookupRow } from "@/lib/deals/lookup";

type Row = { id: number; docType: string };

export function DealDocsUpload({ deals }: { deals: DealLookupRow[] }) {
  const [dealName, setDealName] = useState("");
  const [dealId, setDealId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ id: 0, docType: "dec" }]);
  const [nextId, setNextId] = useState(1);

  const match = useMemo(
    () => matchDealLookup(deals, dealName, dealId || null),
    [deals, dealName, dealId],
  );
  const suggestions = useMemo(() => suggestDealLookup(deals, dealName, 8), [deals, dealName]);

  function pickDeal(row: DealLookupRow) {
    setDealId(row.id);
    setDealName(row.title);
  }

  function onNameChange(value: string) {
    setDealName(value);
    const next = matchDealLookup(deals, value);
    setDealId(next?.id ?? "");
  }

  return (
    <form action={uploadDealDocuments} className="ff-card space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-navy">Upload documents onto a deal</h2>
        <p className="mt-1 text-helper text-muted-foreground">
          Pick the Deal first — person or business name, lookup from existing shops. Each line is
          a doc type plus a file. Add another line for more. Multi-file on a line is fine.
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
          list="deal-lookup"
          value={dealName}
          onChange={(event) => onNameChange(event.target.value)}
          className="mt-1 h-8"
          placeholder="Ruiz, Elena or Harbor Key Marine"
          autoComplete="off"
        />
        <datalist id="deal-lookup">
          {deals.map((row) => (
            <option key={row.id} value={row.title}>
              {row.partyName ?? row.title}
            </option>
          ))}
        </datalist>
        <input type="hidden" name="dealId" value={match?.id ?? dealId} />
        <input type="hidden" name="rowCount" value={rows.length} />
        {match ? (
          <p className="mt-1 text-xs text-fit-green">
            Will attach to <span className="font-medium">{match.title}</span>
            {match.partyName ? ` · ${match.partyName}` : ""}.
          </p>
        ) : dealName.trim() ? (
          <p className="mt-1 text-xs text-fit-flag">
            No unique Deal match. Keep typing or pick from the list — files will not store until
            a Deal is selected.
          </p>
        ) : (
          <p className="mt-1 text-helper text-muted-foreground">Required before files are stored.</p>
        )}
        {suggestions.length > 0 && dealName.trim() && !match ? (
          <ul className="mt-2 space-y-1">
            {suggestions.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="text-left text-xs text-primary hover:underline"
                  onClick={() => pickDeal(row)}
                >
                  {row.title}
                  {row.partyName ? ` · ${row.partyName}` : ""}
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
