"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mergeParsedAddress } from "@/lib/address/fill";
import { addressFillForKey, qualifyAddressFill } from "@/lib/address/keys";
import { addressFingerprint, parseAddressLine } from "@/lib/address/compare";
import {
  ADDRESS_CONFIRMED_SUFFIX,
  ADDRESS_VERIFY_SUFFIX,
  parseAddressVerifyMeta,
  serializeAddressVerifyMeta,
  type AddressVerifyPersistStatus,
} from "@/lib/address/verify-state";
import {
  ADDRESS_QUIET_VERIFY_DEFAULT,
  ADDRESS_VERIFY_NOT_CONFIGURED,
  interpretAddressVerifyResponse,
  shouldAttemptQuietVerify,
  shouldSkipQuietVerifyForFingerprint,
  type AddressVerifyAttemptReason,
  type AddressVerifyChip,
} from "@/lib/address/verify-run";
import {
  addressIsComplete,
  formatAddressLine,
  type AddressFillMap,
  type AddressSuggestion,
  type ParsedAddress,
} from "@/lib/address/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type { AddressFillMap, ParsedAddress };

type VerifyChip = AddressVerifyChip;

type NamedControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function cssName(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function namedFromList(named: Element | RadioNodeList | null): NamedControl | null {
  if (named instanceof RadioNodeList) {
    const first: Node | null = named.item(0);
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

function persistStatus(chip: VerifyChip): AddressVerifyPersistStatus {
  if (chip === "updated") return "updated";
  if (chip === "confirmed") return "confirmed";
  return "not_verified";
}

/**
 * Shared address control. Mapbox typeahead when a token is configured.
 * FedEx is verification-only and button-first — never typeahead, never silent.
 * Without Mapbox the field stays plain text. Verify address stays visible even
 * when FedEx is missing; a click must not look like success.
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
  verifyMeta,
  skipVerify = false,
  quietVerify = ADDRESS_QUIET_VERIFY_DEFAULT,
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
  verifyMeta?: string | null;
  skipVerify?: boolean;
  /** Soft opt-in. Default off — only Verify address POSTs FedEx. */
  quietVerify?: boolean;
}) {
  const reactId = useId();
  const inputId = id ?? `addr-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const initialMeta = parseAddressVerifyMeta(verifyMeta);
  const initialConfirmed =
    !skipVerify && (initialMeta?.status === "confirmed" || initialMeta?.status === "updated");
  const lastVerifySig = useRef(initialMeta?.fingerprint ?? "");
  const listActiveRef = useRef(false);
  const runVerifyRef = useRef<(reason: AddressVerifyAttemptReason) => void>(() => {});
  const resolvedFill = qualifyAddressFill(fill ?? addressFillForKey(name), name);
  const [query, setQuery] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [listActive, setListActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [verifyEnabled, setVerifyEnabled] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [verifyStatus, setVerifyStatus] = useState<VerifyChip>(() =>
    initialConfirmed ? (initialMeta?.status === "updated" ? "updated" : "confirmed") : "idle",
  );
  const [verifyFingerprint, setVerifyFingerprint] = useState(initialMeta?.fingerprint ?? "");
  const [suggested, setSuggested] = useState<ParsedAddress | null>(null);
  const [entered, setEntered] = useState<ParsedAddress | null>(null);

  useEffect(() => {
    listActiveRef.current = listActive;
  }, [listActive]);

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
    if (!enabled || readOnly || disabled || !listActive) {
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      return;
    }
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/address/suggest?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { suggestions?: AddressSuggestion[]; enabled?: boolean };
        setEnabled(data.enabled !== false);
        setSuggestions(data.suggestions ?? []);
        setOpen(Boolean(data.suggestions?.length) && listActiveRef.current);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, enabled, readOnly, disabled, listActive]);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!boxRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!quietVerify || skipVerify || readOnly || disabled) return;
    const watched = new Set(
      [name, resolvedFill.city, resolvedFill.state, resolvedFill.zip].filter(Boolean) as string[],
    );
    const scope: EventTarget =
      boxRef.current?.closest(
        "[data-ff-deal-section], [data-ff-address-fieldset], [data-ff-record-section], form",
      ) ??
      inputRef.current?.form ??
      document;
    function onFocusOut(event: Event) {
      const target = event.target as HTMLElement | null;
      const fieldName = target?.getAttribute("name");
      if (!fieldName || !watched.has(fieldName)) return;
      window.setTimeout(() => {
        runVerifyRef.current("blur");
      }, 200);
    }
    function onSubmit() {
      runVerifyRef.current("save");
    }
    scope.addEventListener("focusout", onFocusOut);
    const formEl = inputRef.current?.form;
    formEl?.addEventListener("submit", onSubmit);
    return () => {
      scope.removeEventListener("focusout", onFocusOut);
      formEl?.removeEventListener("submit", onSubmit);
    };
  }, [
    disabled,
    name,
    quietVerify,
    readOnly,
    resolvedFill.city,
    resolvedFill.state,
    resolvedFill.zip,
    skipVerify,
  ]);

  useEffect(() => {
    if (!quietVerify || skipVerify || readOnly || disabled || verifyEnabled !== true) return;
    if (
      verifyStatus === "confirmed" ||
      verifyStatus === "updated" ||
      verifyStatus === "checking" ||
      verifyStatus === "suggested"
    ) {
      return;
    }
    const handle = window.setTimeout(() => {
      runVerifyRef.current("blur");
    }, 0);
    return () => window.clearTimeout(handle);
    // Soft opt-in only: retry once after FedEx status is known on.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when verify becomes enabled
  }, [disabled, quietVerify, readOnly, skipVerify, verifyEnabled]);

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
      boxRef.current?.closest(
        "[data-ff-deal-section], [data-ff-address-fieldset], [data-ff-record-section]",
      ) ??
      inputRef.current?.closest(
        "[data-ff-deal-section], [data-ff-address-fieldset], [data-ff-record-section]",
      );
    return section ?? hostForm() ?? (typeof document !== "undefined" ? document : null);
  }

  function readBlock(): ParsedAddress {
    const root: ParentNode | null =
      fillScope() ?? hostForm() ?? (typeof document !== "undefined" ? document : null);
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

  function rememberFingerprint(sig: string) {
    lastVerifySig.current = sig;
    setVerifyFingerprint(sig);
  }

  async function runVerify(reason: AddressVerifyAttemptReason) {
    if (skipVerify || readOnly || disabled) return;
    if (reason !== "button" && !shouldAttemptQuietVerify(verifyEnabled, quietVerify)) return;
    const address = readBlock();
    if (!addressIsComplete(address)) {
      if (reason === "button" || (reason === "save" && query.trim())) setVerifyStatus("not_verified");
      return;
    }
    const sig = addressFingerprint(address);
    if (shouldSkipQuietVerifyForFingerprint(reason, sig, lastVerifySig.current, verifyStatus)) {
      return;
    }
    rememberFingerprint(sig);
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
      const interpreted = interpretAddressVerifyResponse(data, reason);
      setVerifyEnabled(interpreted.verifyEnabled);
      if (interpreted.chip === "confirmed") {
        setSuggested(null);
        setEntered(null);
        setVerifyStatus("confirmed");
        setConfirmed(true);
        return;
      }
      if (interpreted.chip === "suggested" && data.resolved) {
        setEntered(address);
        setSuggested(data.resolved);
        setVerifyStatus("suggested");
        setConfirmed(false);
        return;
      }
      setSuggested(null);
      setEntered(null);
      setVerifyStatus(interpreted.chip === "suggested" ? "not_verified" : interpreted.chip);
      setConfirmed(false);
    } catch {
      rememberFingerprint("");
      setVerifyStatus("not_verified");
    }
  }
  useEffect(() => {
    runVerifyRef.current = (reason) => {
      void runVerify(reason);
    };
  });

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
    return merged;
  }

  function choose(item: AddressSuggestion) {
    setOpen(false);
    setSuggestions([]);
    applyAddress(item.address, item.label);
    if (!quietVerify) return;
    window.setTimeout(() => {
      void runVerify("confirm");
    }, 0);
  }

  function applySuggestedAddress() {
    if (!suggested) return;
    const merged = applyAddress(suggested, formatAddressLine(suggested));
    rememberFingerprint(addressFingerprint(merged));
    setVerifyStatus("updated");
    setConfirmed(true);
    setSuggested(null);
    setEntered(null);
  }

  function keepEnteredAddress() {
    const keep = entered ?? readBlock();
    rememberFingerprint(addressIsComplete(keep) ? addressFingerprint(keep) : "");
    setVerifyStatus("confirmed");
    setConfirmed(true);
    setSuggested(null);
    setEntered(null);
  }

  const persistMeta =
    verifyStatus === "confirmed" || verifyStatus === "updated"
      ? serializeAddressVerifyMeta({
          status: persistStatus(verifyStatus),
          fingerprint: verifyFingerprint,
        })
      : verifyStatus === "not_verified"
        ? serializeAddressVerifyMeta({ status: "not_verified", fingerprint: verifyFingerprint })
        : "";

  return (
    <div
      ref={boxRef}
      className="relative"
      data-ff-address-autocomplete
      data-ff-address-enabled={enabled ? "1" : "0"}
      data-ff-address-verify-enabled={verifyEnabled && !skipVerify ? "1" : "0"}
      data-ff-address-quiet-verify={quietVerify ? "1" : "0"}
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
        autoFocus={false}
        className={className}
        data-ff-address-confirmed={confirmed ? "true" : "false"}
        onChange={(e) => {
          setListActive(true);
          setQuery(e.target.value);
          setConfirmed(false);
          setVerifyStatus("idle");
          setSuggested(null);
          setEntered(null);
          rememberFingerprint("");
          if (e.target.value.trim().length < 3) {
            setSuggestions([]);
            setOpen(false);
          }
          onChange?.(e.target.value);
        }}
        onFocus={() => {
          setListActive(true);
          if (suggestions.length) setOpen(true);
        }}
        onBlur={() => {
          if (!quietVerify) return;
          window.setTimeout(() => {
            runVerifyRef.current("blur");
          }, 200);
        }}
      />
      <input type="hidden" name={`${name}${ADDRESS_CONFIRMED_SUFFIX}`} form={form} value={confirmed ? "1" : ""} />
      <input type="hidden" name={`${name}${ADDRESS_VERIFY_SUFFIX}`} form={form} value={persistMeta} />
      {open && listActive && suggestions.length > 0 ? (
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
      {loading && listActive ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground">Looking up addresses…</p>
      ) : null}
      {!skipVerify ? (
        <div className="mt-1.5 space-y-1" data-ff-address-toolbar>
          {!readOnly && !disabled ? (
            <button
              type="button"
              data-ff-address-verify
              disabled={verifyStatus === "checking"}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-navy/30 text-navy hover:border-navy/50 disabled:cursor-wait",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                void runVerify("button");
              }}
            >
              Verify address
            </button>
          ) : null}
          {verifyStatus !== "idle" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {verifyStatus === "checking" ? (
              <span className="text-[10px] text-muted-foreground" data-ff-address-verify-chip="checking">
                Checking address…
              </span>
            ) : null}
            {verifyStatus === "confirmed" ? (
              <span
                className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
                data-ff-address-verify-chip="confirmed"
                data-ff-address-stamp="confirmed"
              >
                Address confirmed
              </span>
            ) : null}
            {verifyStatus === "updated" ? (
              <span
                className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
                data-ff-address-verify-chip="updated"
                data-ff-address-stamp="updated"
              >
                Address updated
              </span>
            ) : null}
            {verifyStatus === "suggested" ? (
              <span
                className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"
                data-ff-address-verify-chip="suggested"
              >
                Address suggested
              </span>
            ) : null}
            {verifyStatus === "not_verified" || verifyStatus === "unmatched" ? (
              <span className="text-[10px] text-muted-foreground" data-ff-address-verify-chip="not_verified">
                Not verified
              </span>
            ) : null}
            {verifyStatus === "not_configured" ? (
              <span
                className="text-[10px] text-muted-foreground"
                data-ff-address-verify-chip="not_configured"
              >
                {ADDRESS_VERIFY_NOT_CONFIGURED}
              </span>
            ) : null}
          </div>
          ) : null}
        </div>
      ) : null}
      {!skipVerify && verifyStatus === "suggested" && suggested ? (
        <div
          className="mt-1.5 grid gap-2 rounded-md border border-border/70 bg-muted/30 p-2 sm:grid-cols-2"
          data-ff-address-compare
          data-ff-address-suggested
        >
          <div data-ff-address-entered>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Address entered
            </p>
            <p className="mt-0.5 text-[11px] text-navy">
              {formatAddressLine(entered ?? suggested)}
            </p>
            <button
              type="button"
              data-ff-address-use-entered
              className="mt-1 text-[10px] font-medium text-navy underline-offset-2 hover:underline"
              onClick={keepEnteredAddress}
            >
              Use entered
            </button>
          </div>
          <div data-ff-address-suggested-choice>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Address suggested
            </p>
            <p className="mt-0.5 text-[11px] text-navy">{formatAddressLine(suggested)}</p>
            <button
              type="button"
              data-ff-address-use-suggested
              className="mt-1 text-[10px] font-medium text-navy underline-offset-2 hover:underline"
              onClick={applySuggestedAddress}
            >
              Use suggested
            </button>
          </div>
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
