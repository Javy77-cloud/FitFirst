"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mergeParsedAddress } from "@/lib/address/fill";
import { addressFillForKey, qualifyAddressFill } from "@/lib/address/keys";
import { addressFingerprint, parseAddressLine } from "@/lib/address/compare";
import {
  addressIsComplete,
  formatAddressLine,
  type AddressFillMap,
  type AddressSuggestion,
  type ParsedAddress,
} from "@/lib/address/types";
import { cn } from "@/lib/utils";

export type { AddressFillMap, ParsedAddress };

type VerifyChip = "idle" | "checking" | "verified" | "suggested" | "unmatched" | "error";

type NamedControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function cssName(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function namedFromList(named: Element | RadioNodeList | null): NamedControl | null {
  if (named instanceof RadioNodeList) {
    const first = named[0];
    return first instanceof HTMLInputElement ||
      first instanceof HTMLTextAreaElement ||
      first instanceof HTMLSelectElement
      ? first
      : null;
  }
  if (
    named instanceof HTMLInputElement ||
    named instanceof HTMLTextAreaElement ||
    named instanceof HTMLSelectElement
  ) {
    return named;
  }
  return null;
}

function queryNamed(root: ParentNode | null, name: string): NamedControl | null {
  if (!root) return null;
  const el = root.querySelector(`[name="${cssName(name)}"], [id="${cssName(name)}"]`);
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return el;
  }
  return null;
}

function findNamedControl(scope: ParentNode | null, name: string | undefined): NamedControl | null {
  if (!name) return null;
  const fromScope = queryNamed(scope, name);
  if (fromScope) return fromScope;
  if (scope instanceof HTMLFormElement) {
    const fromElements = namedFromList(scope.elements.namedItem(name));
    if (fromElements) return fromElements;
  }
  if (typeof document === "undefined") return null;
  const byId = document.getElementById(name);
  if (
    byId instanceof HTMLInputElement ||
    byId instanceof HTMLTextAreaElement ||
    byId instanceof HTMLSelectElement
  ) {
    return byId;
  }
  return queryNamed(document, name);
}

function setNativeValue(el: NamedControl, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function writeSibling(scope: ParentNode | null, name: string | undefined, value: string) {
  if (!name) return;
  const el = findNamedControl(scope, name);
  if (!el) return;
  setNativeValue(el, value);
}

function readNamed(root: ParentNode | null, name: string | undefined): string {
  return findNamedControl(root, name)?.value.trim() ?? "";
}

/**
 * Shared address control. Mapbox typeahead when a token is configured.
 * FedEx is verification-only — never typeahead. Without Mapbox the field stays plain text.
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
  const lastVerifySig = useRef("");
  const runVerifyRef = useRef<(reason: "button" | "blur" | "confirm") => void>(() => {});
  const resolvedFill = qualifyAddressFill(fill ?? addressFillForKey(name), name);
  const [query, setQuery] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [verifyEnabled, setVerifyEnabled] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<VerifyChip>("idle");
  const [suggested, setSuggested] = useState<ParsedAddress | null>(null);

  useEffect(() => {
    setQuery(defaultValue ?? "");
  }, [defaultValue]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/address/status")
      .then(
        (res) =>
          res.json() as Promise<{ enabled?: boolean; verifyEnabled?: boolean; autocomplete?: string | null }>,
      )
      .then((data) => {
        if (cancelled) return;
        setEnabled(Boolean(data.enabled));
        setVerifyEnabled(Boolean(data.verifyEnabled));
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(false);
        setVerifyEnabled(false);
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

  useEffect(() => {
    const formEl = inputRef.current?.form;
    if (!formEl || !verifyEnabled || readOnly || disabled) return;
    const watched = new Set(
      [name, resolvedFill.city, resolvedFill.state, resolvedFill.zip].filter(Boolean) as string[],
    );
    function onFocusOut(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      const fieldName = target?.getAttribute("name");
      if (!fieldName || !watched.has(fieldName)) return;
      window.setTimeout(() => {
        runVerifyRef.current("blur");
      }, 200);
    }
    formEl.addEventListener("focusout", onFocusOut);
    return () => formEl.removeEventListener("focusout", onFocusOut);
  }, [disabled, name, readOnly, resolvedFill.city, resolvedFill.state, resolvedFill.zip, verifyEnabled]);

  function hostForm(): HTMLFormElement | null {
    return (
      inputRef.current?.form ??
      inputRef.current?.closest("form") ??
      boxRef.current?.closest("form") ??
      null
    );
  }

  function fillScope(): ParentNode | null {
    const section =
      boxRef.current?.closest("[data-ff-deal-section], [data-ff-address-fieldset]") ??
      inputRef.current?.closest("[data-ff-deal-section], [data-ff-address-fieldset]");
    return section ?? hostForm() ?? (typeof document !== "undefined" ? document : null);
  }

  function readBlock(): ParsedAddress {
    const formEl = hostForm();
    const root: ParentNode | null = formEl ?? boxRef.current?.closest("[data-ff-address-fieldset]") ?? document;
    const fromSiblings: ParsedAddress = {
      street: query.trim(),
      city: readNamed(root, resolvedFill.city),
      state: readNamed(root, resolvedFill.state),
      zip: readNamed(root, resolvedFill.zip),
      county: readNamed(root, resolvedFill.county),
      country: "US",
    };
    if (addressIsComplete(fromSiblings)) return fromSiblings;
    const parsed = parseAddressLine(query);
    return {
      street: fromSiblings.street || parsed.street,
      city: fromSiblings.city || parsed.city,
      state: fromSiblings.state || parsed.state,
      zip: fromSiblings.zip || parsed.zip,
      county: fromSiblings.county || parsed.county,
      country: "US",
    };
  }

  async function runVerify(reason: "button" | "blur" | "confirm") {
    if (!verifyEnabled || readOnly || disabled) return;
    const address = readBlock();
    if (!addressIsComplete(address)) {
      if (reason === "button") setVerifyStatus("unmatched");
      return;
    }
    const sig = addressFingerprint(address);
    if (reason !== "button" && lastVerifySig.current === sig) return;
    lastVerifySig.current = sig;
    setVerifyStatus("checking");
    try {
      const res = await fetch("/api/address/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(address),
      });
      const data = (await res.json()) as {
        status?: string;
        enabled?: boolean;
        resolved?: ParsedAddress | null;
      };
      if (data.enabled === false) {
        setVerifyEnabled(false);
        setVerifyStatus("idle");
        return;
      }
      if (data.status === "verified") {
        setSuggested(null);
        setVerifyStatus("verified");
        setConfirmed(true);
        return;
      }
      if (data.status === "suggested" && data.resolved) {
        setSuggested(data.resolved);
        setVerifyStatus("suggested");
        return;
      }
      setSuggested(null);
      setVerifyStatus(data.status === "incomplete" ? "idle" : "unmatched");
    } catch {
      lastVerifySig.current = "";
      setVerifyStatus("error");
    }
  }
  runVerifyRef.current = (reason) => {
    void runVerify(reason);
  };

  function applyAddress(address: ParsedAddress | null | undefined, fallbackLabel: string) {
    const merged = mergeParsedAddress(address, fallbackLabel);
    const street = merged.street || fallbackLabel.split(",")[0]?.trim() || fallbackLabel;
    const next = composeOnConfirm ? formatAddressLine({ ...merged, street }) || fallbackLabel : street;
    setQuery(next);
    setConfirmed(addressIsComplete(merged) || Boolean(street));
    if (inputRef.current) inputRef.current.value = next;
    const scope = fillScope();
    writeSibling(scope, resolvedFill.city, merged.city);
    writeSibling(scope, resolvedFill.state, merged.state);
    writeSibling(scope, resolvedFill.zip, merged.zip);
    writeSibling(scope, resolvedFill.county, merged.county);
    onConfirm?.(merged);
    onChange?.(next);
  }

  function choose(item: AddressSuggestion) {
    setOpen(false);
    setSuggestions([]);
    applyAddress(item.address, item.label);
    window.setTimeout(() => {
      void runVerify("confirm");
    }, 0);
  }

  function applySuggestion() {
    if (!suggested) return;
    applyAddress(suggested, formatAddressLine(suggested));
    setVerifyStatus("verified");
    setSuggested(null);
    lastVerifySig.current = addressFingerprint(suggested);
  }

  return (
    <div
      ref={boxRef}
      className="relative"
      data-ff-address-autocomplete
      data-ff-address-enabled={enabled ? "1" : "0"}
      data-ff-address-verify-enabled={verifyEnabled ? "1" : "0"}
      data-ff-address-fill-city={resolvedFill.city ?? ""}
      data-ff-address-fill-state={resolvedFill.state ?? ""}
      data-ff-address-fill-zip={resolvedFill.zip ?? ""}
      data-ff-address-fill-county={resolvedFill.county ?? ""}
    >
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
          setVerifyStatus("idle");
          setSuggested(null);
          lastVerifySig.current = "";
          onChange?.(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            runVerifyRef.current("blur");
          }, 200);
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
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {loading ? <p className="mt-0.5 text-[10px] text-muted-foreground">Looking up addresses…</p> : null}
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5" data-ff-address-toolbar>
        {verifyEnabled && !readOnly && !disabled ? (
          <button
            type="button"
            data-ff-address-verify
            className="text-[10px] font-medium text-navy underline-offset-2 hover:underline"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              void runVerify("button");
            }}
          >
            Verify address
          </button>
        ) : null}
        {verifyStatus === "checking" ? (
          <span className="text-[10px] text-muted-foreground" data-ff-address-verify-chip="checking">
            Checking…
          </span>
        ) : null}
        {verifyStatus === "verified" ? (
          <span
            className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
            data-ff-address-verify-chip="verified"
          >
            Verified
          </span>
        ) : null}
        {verifyStatus === "suggested" ? (
          <span
            className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"
            data-ff-address-verify-chip="suggested"
          >
            Suggested correction
          </span>
        ) : null}
        {verifyStatus === "unmatched" ? (
          <span className="text-[10px] text-muted-foreground" data-ff-address-verify-chip="unmatched">
            Could not verify
          </span>
        ) : null}
        {verifyStatus === "error" ? (
          <span className="text-[10px] text-muted-foreground" data-ff-address-verify-chip="error">
            Verify failed
          </span>
        ) : null}
        {!loading && confirmed && verifyStatus === "idle" ? (
          <p className="text-[10px] text-muted-foreground" data-ff-address-confirmed-label>
            Address confirmed
          </p>
        ) : null}
      </div>
      {verifyStatus === "suggested" && suggested ? (
        <div className="mt-0.5" data-ff-address-suggested>
          <p className="text-[10px] text-muted-foreground">{formatAddressLine(suggested)}</p>
          <button
            type="button"
            data-ff-address-use-suggested
            className="text-[10px] font-medium text-navy underline-offset-2 hover:underline"
            onClick={applySuggestion}
          >
            Use suggested address
          </button>
        </div>
      ) : null}
    </div>
  );
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
