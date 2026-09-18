"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  splitTypedPartyName,
  suggestParties,
  type PartyHit,
  type PartyRecord,
} from "@/lib/crm/party-typeahead";
import { cn } from "@/lib/utils";

export function PartyTypeahead({
  parties,
  id = "dealName",
  name = "dealName",
  label = "Deal name",
  required = false,
  placeholder = "Name, email, or phone — Contacts and Accounts",
  titleName,
  defaultQuery = "",
  onPick,
}: {
  parties: PartyRecord[];
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  /** When set, writes the selected / typed label into this hidden field (pipeline title). */
  titleName?: string;
  defaultQuery?: string;
  onPick?: (hit: PartyHit | null, query: string) => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [picked, setPicked] = useState<PartyHit | null>(null);
  const suggestions = useMemo(() => suggestParties(parties, query, 12), [parties, query]);
  const parsed = splitTypedPartyName(query);

  function applyQuery(value: string) {
    setQuery(value);
    setPicked(null);
    onPick?.(null, value);
  }

  function pick(hit: PartyHit) {
    setQuery(hit.title);
    setPicked(hit);
    onPick?.(hit, hit.title);
  }

  const firstName = picked?.firstName || parsed.firstName;
  const lastName = picked?.lastName || parsed.lastName;
  const titleValue = picked?.title || query.trim();

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <input
        id={id}
        name={name}
        type="search"
        required={required}
        autoComplete="off"
        value={query}
        onChange={(event) => applyQuery(event.target.value)}
        placeholder={placeholder}
        className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        data-testid="deal-name-typeahead"
      />
      <input type="hidden" name="contactId" value={picked?.kind === "contact" ? picked.id : ""} />
      <input type="hidden" name="accountId" value={picked?.kind === "business" ? picked.id : ""} />
      <input type="hidden" name="firstName" value={firstName} />
      <input type="hidden" name="lastName" value={lastName} />
      {titleName ? <input type="hidden" name={titleName} value={titleValue} /> : null}
      {query.trim() ? (
        <ul
          className="max-h-48 overflow-auto rounded-md border border-border bg-card"
          data-testid="deal-name-suggestions"
        >
          {suggestions.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              No Contact or Business matches. Keep typing a new name, or check email / phone.
            </li>
          ) : (
            suggestions.map((hit) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <button
                  type="button"
                  onClick={() => pick(hit)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm",
                    picked?.id === hit.id ? "bg-fit-check-bg text-navy" : "hover:bg-muted",
                  )}
                >
                  <span>
                    <span className="font-medium">{hit.title}</span>
                    <span className="ml-2 text-helper text-muted-foreground">{hit.subtitle}</span>
                  </span>
                  <span className="shrink-0 text-[11px] uppercase text-muted-foreground">{hit.kind}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <p className="text-helper text-muted-foreground">
          Type to pull Contacts and Accounts. Contains match on name, email, or phone.
        </p>
      )}
      {picked ? (
        <p className="text-xs text-fit-green">
          Linked {picked.kind === "contact" ? "Contact" : "Business"}:{" "}
          <span className="font-medium">{picked.title}</span>
        </p>
      ) : null}
    </div>
  );
}
