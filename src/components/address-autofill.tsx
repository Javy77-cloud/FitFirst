"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ParsedAddress } from "@/lib/places/address";

export type AddressFillMap = {
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
};

type Suggestion = { label: string; placeId: string };

function writeSibling(form: HTMLFormElement | null, name: string | undefined, value: string) {
  if (!form || !name || !value) return;
  const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Street input with Google Places suggestions.
 * Without GOOGLE_MAPS_API_KEY / NEXT_PUBLIC_GOOGLE_MAPS_API_KEY the field is a
 * normal text box — the desk still loads and the agent types the address.
 */
export function AddressAutofill({
  name,
  id,
  defaultValue,
  required,
  placeholder = "Start typing a street address",
  className,
  autoComplete = "off",
  fill = { city: "city", state: "state", zip: "zip", county: "county" },
  disabled,
  readOnly,
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
}) {
  const reactId = useId();
  const inputId = id ?? `addr-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stub, setStub] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    setQuery(defaultValue ?? "");
  }, [defaultValue]);

  useEffect(() => {
    if (readOnly || disabled) return;
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { suggestions?: Suggestion[]; stub?: boolean };
        setStub(Boolean(data.stub));
        setSuggestions(data.suggestions ?? []);
        setOpen(Boolean(data.suggestions?.length));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, readOnly, disabled]);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!boxRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function choose(item: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(item.placeId)}`);
      const data = (await res.json()) as { address?: ParsedAddress | null };
      const address = data.address;
      const street = address?.street || item.label.split(",")[0]?.trim() || item.label;
      setQuery(street);
      if (inputRef.current) inputRef.current.value = street;
      const form = inputRef.current?.form ?? null;
      writeSibling(form, fill.city, address?.city ?? "");
      writeSibling(form, fill.state, address?.state ?? "");
      writeSibling(form, fill.zip, address?.zip ?? "");
      writeSibling(form, fill.county, address?.county ?? "");
    } catch {
      setQuery(item.label);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        ref={inputRef}
        id={inputId}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCorrect="off"
        spellCheck={false}
        className={className}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
      />
      {open && suggestions.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-card py-1 text-sm shadow-md"
        >
          {suggestions.map((item) => (
            <li key={item.placeId}>
              <button
                type="button"
                className="w-full px-2.5 py-1.5 text-left text-navy hover:bg-muted"
                onClick={() => void choose(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {loading ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground">Looking up addresses…</p>
      ) : stub ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Type the address. Add GOOGLE_MAPS_API_KEY for Places suggestions.
        </p>
      ) : null}
    </div>
  );
}

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
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <div className="sm:col-span-2">
        <Label htmlFor={streetId} className="text-xs">
          {streetLabel}
        </Label>
        <AddressAutofill
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
