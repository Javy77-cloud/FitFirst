"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addressFillForKey } from "@/lib/address/keys";
import {
  formatAddressLine,
  type AddressFillMap,
  type AddressSuggestion,
  type ParsedAddress,
} from "@/lib/address/types";
import { cn } from "@/lib/utils";

export type { AddressFillMap, ParsedAddress };

function writeSibling(form: HTMLFormElement | null, name: string | undefined, value: string) {
  if (!form || !name) return;
  const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Shared address control. With a configured FedEx vault/env key: typeahead + confirm.
 * Without a key: a plain text input — no fake copy that pretends FedEx is live.
 */
export function AddressAutocomplete({
  name,
  id,
  defaultValue,
  required,
  placeholder = "Start typing a street address",
  className,
  autoComplete = "off",
  fill,
  disabled,
  readOnly,
  form,
  composeOnConfirm = false,
  onConfirm,
  onChange,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  fill?: AddressFillMap;
  disabled?: boolean;
  readOnly?: boolean;
  form?: string;
  composeOnConfirm?: boolean;
  onConfirm?: (address: ParsedAddress) => void;
  onChange?: (value: string) => void;
}) {
  const reactId = useId();
  const inputId = id ?? `addr-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const map = fill ?? addressFillForKey(name);
  const [query, setQuery] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setQuery(defaultValue ?? "");
  }, [defaultValue]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/address/status")
      .then((res) => res.json() as Promise<{ enabled?: boolean }>)
      .then((data) => {
        if (!cancelled) setEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled || readOnly || disabled) {
      setSuggestions([]);
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/address/suggest?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { suggestions?: AddressSuggestion[]; enabled?: boolean };
        setEnabled(data.enabled !== false);
        setSuggestions(data.suggestions ?? []);
        setOpen(Boolean(data.suggestions?.length));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, enabled, readOnly, disabled]);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!boxRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function applyAddress(address: ParsedAddress, fallbackLabel: string) {
    const street = address.street || fallbackLabel.split(",")[0]?.trim() || fallbackLabel;
    const next = composeOnConfirm ? formatAddressLine({ ...address, street }) || fallbackLabel : street;
    setQuery(next);
    setConfirmed(addressIsFilled(address));
    if (inputRef.current) inputRef.current.value = next;
    const host = inputRef.current?.form ?? null;
    writeSibling(host, map.city, address.city);
    writeSibling(host, map.state, address.state);
    writeSibling(host, map.zip, address.zip);
    writeSibling(host, map.county, address.county);
    onConfirm?.(address);
    onChange?.(next);
  }

  function choose(item: AddressSuggestion) {
    setOpen(false);
    setSuggestions([]);
    applyAddress(item.address, item.label);
  }

  return (
    <div ref={boxRef} className="relative" data-ff-address-autocomplete data-ff-address-enabled={enabled ? "1" : "0"}>
      <Input
        ref={inputRef}
        id={inputId}
        name={name}
        form={form}
        value={query}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCorrect="off"
        spellCheck={false}
        className={className}
        data-ff-address-confirmed={confirmed ? "true" : "false"}
        onChange={(e) => {
          setQuery(e.target.value);
          setConfirmed(false);
          onChange?.(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
      />
      <input type="hidden" name={`${name}__confirmed`} form={form} value={confirmed ? "1" : ""} />
      {open && suggestions.length > 0 ? (
        <ul
          role="listbox"
          data-ff-address-suggestions
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-card py-1 text-sm shadow-md"
        >
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-2.5 py-1.5 text-left text-navy hover:bg-muted"
                onClick={() => choose(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {loading ? <p className="mt-0.5 text-[10px] text-muted-foreground">Looking up addresses…</p> : null}
      {!loading && confirmed ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground" data-ff-address-confirmed-label>
          Address confirmed
        </p>
      ) : null}
    </div>
  );
}

function addressIsFilled(address: ParsedAddress): boolean {
  return Boolean(address.street && (address.city || address.zip));
}

/** @deprecated Use AddressAutocomplete. Same control — kept so existing imports keep compiling. */
export const AddressAutofill = AddressAutocomplete;

export function AddressFieldset({
  streetName,
  streetLabel = "Address",
  streetId,
  defaultStreet,
  defaultCity,
  defaultState,
  defaultZip,
  defaultCounty,
  required,
  showCounty = false,
  fill,
  className,
}: {
  streetName: string;
  streetLabel?: string;
  streetId?: string;
  defaultStreet?: string | null;
  defaultCity?: string | null;
  defaultState?: string | null;
  defaultZip?: string | null;
  defaultCounty?: string | null;
  required?: boolean;
  showCounty?: boolean;
  fill?: AddressFillMap;
  className?: string;
}) {
  const map = fill ?? { city: "city", state: "state", zip: "zip", county: "county" };
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)} data-ff-address-fieldset>
      <div className="sm:col-span-2">
        <Label htmlFor={streetId} className="text-xs">
          {streetLabel}
        </Label>
        <AddressAutocomplete
          id={streetId}
          name={streetName}
          defaultValue={defaultStreet}
          required={required}
          fill={map}
          className="mt-1 h-8"
        />
      </div>
      <div>
        <Label className="text-xs">City</Label>
        <Input name={map.city ?? "city"} defaultValue={defaultCity ?? ""} className="mt-1 h-8" />
      </div>
      <div>
        <Label className="text-xs">State</Label>
        <Input name={map.state ?? "state"} defaultValue={defaultState ?? "FL"} className="mt-1 h-8" />
      </div>
      <div>
        <Label className="text-xs">ZIP</Label>
        <Input name={map.zip ?? "zip"} defaultValue={defaultZip ?? ""} className="mt-1 h-8" />
      </div>
      {showCounty ? (
        <div>
          <Label className="text-xs">County</Label>
          <Input name={map.county ?? "county"} defaultValue={defaultCounty ?? ""} className="mt-1 h-8" />
        </div>
      ) : null}
    </div>
  );
}
