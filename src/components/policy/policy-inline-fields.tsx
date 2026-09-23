"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  searchCarriersForPolicyLink,
  updatePolicyField,
} from "@/app/actions/policy-record";
import { PolicySensitiveConfirmDialog } from "@/components/policy/policy-sensitive-confirm";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { flashAction } from "@/lib/flash-client";
import {
  isPolicySensitiveInlineKey,
  sensitiveFieldConfirmCopy,
} from "@/lib/policy/sensitive-fields";
import { cn } from "@/lib/utils";

function displayValue(value: string | null | undefined) {
  const v = (value ?? "").trim();
  return v ? v : "—";
}

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  if (Number.isNaN(value.getTime())) return "";
  return value.toISOString().slice(0, 10);
}

function formatDisplayDate(value: string | Date | null | undefined): string {
  const iso = toDateInputValue(value);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

export function PolicyInlineText({
  policyId,
  fieldKey,
  label,
  value,
  displayText,
  readOnly = false,
}: {
  policyId: string;
  fieldKey: string;
  label: string;
  value: string;
  /** Optional denser display (e.g. stacked address); edit still uses `value`. */
  displayText?: string;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function persist(next: string, confirmed = false) {
    if (readOnly) {
      setEditing(false);
      return;
    }
    if (next.trim() === (value ?? "").trim()) {
      setEditing(false);
      return;
    }
    if (isPolicySensitiveInlineKey(fieldKey) && !confirmed) {
      setPendingValue(next);
      setConfirmOpen(true);
      return;
    }
    startTransition(async () => {
      const result = await updatePolicyField({
        policyId,
        fieldKey,
        value: next,
        confirmed: confirmed || undefined,
      });
      if (!result.ok) {
        if ("needsConfirm" in result && result.needsConfirm) {
          setPendingValue(next);
          setConfirmOpen(true);
          return;
        }
        flashAction(result.error ?? "Could Not Save", "error");
        setDraft(value);
        setEditing(false);
        return;
      }
      flashAction("Saved");
      setEditing(false);
      setConfirmOpen(false);
      setPendingValue(null);
    });
  }

  const shown = displayText?.trim() ? displayText : value;
  const stacked = Boolean(displayText?.includes("\n"));

  return (
    <div data-ff-policy-inline={fieldKey}>
      <dt className="text-helper text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-medium text-navy",
          stacked && "whitespace-pre-line leading-snug",
        )}
        data-ff-address-compact={stacked ? "" : undefined}
      >
        {readOnly ? (
          displayValue(shown)
        ) : editing ? (
          <input
            autoFocus
            className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => persist(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className={cn(
              "w-full rounded-sm px-0.5 text-left hover:bg-[#002868]/5",
              stacked && "whitespace-pre-line leading-snug",
              !value?.trim() && "text-muted-foreground",
            )}
            onClick={() => setEditing(true)}
          >
            {displayValue(shown)}
          </button>
        )}
      </dd>
      <PolicySensitiveConfirmDialog
        open={confirmOpen}
        title={`Confirm ${label.toLowerCase()} change`}
        description={sensitiveFieldConfirmCopy(fieldKey)}
        pending={pending}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingValue(null);
          setDraft(value);
          setEditing(false);
        }}
        onConfirm={() => {
          if (pendingValue != null) persist(pendingValue, true);
        }}
      />
    </div>
  );
}

export function PolicyInlineSelect({
  policyId,
  fieldKey,
  label,
  value,
  options,
  readOnly = false,
}: {
  policyId: string;
  fieldKey: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const chosen = options.find((row) => row.value === value)?.label ?? value;

  function persist(next: string) {
    if (readOnly || next.trim() === (value ?? "").trim()) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updatePolicyField({ policyId, fieldKey, value: next });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        setDraft(value);
        setEditing(false);
        return;
      }
      flashAction("Saved");
      setEditing(false);
    });
  }

  return (
    <div data-ff-policy-inline={fieldKey} data-ff-policy-lob-select="">
      <dt className="text-helper text-muted-foreground">{label}</dt>
      <dd className="font-medium text-navy">
        {readOnly ? (
          displayValue(chosen)
        ) : editing ? (
          <select
            autoFocus
            className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            value={draft}
            disabled={pending}
            onChange={(e) => {
              setDraft(e.target.value);
              persist(e.target.value);
            }}
            onBlur={() => setEditing(false)}
          >
            {value && !options.some((row) => row.value === value) ? (
              <option value={value}>{value}</option>
            ) : null}
            {options.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            className={cn(
              "w-full rounded-sm px-0.5 text-left hover:bg-[#002868]/5",
              !value?.trim() && "text-muted-foreground",
            )}
            onClick={() => setEditing(true)}
          >
            {displayValue(chosen)}
          </button>
        )}
      </dd>
    </div>
  );
}

export function PolicyInlineDate({
  policyId,
  fieldKey,
  label,
  value,
  readOnly = false,
  allowEmpty = false,
}: {
  policyId: string;
  fieldKey: "effectiveDate" | "expirationDate" | "renewalDate";
  label: string;
  value: string | Date | null | undefined;
  readOnly?: boolean;
  allowEmpty?: boolean;
}) {
  const display = formatDisplayDate(value);
  const initial = toDateInputValue(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDateInputValue(value));
  }, [value]);

  function persist(next: string, confirmed = false) {
    if (readOnly) {
      setEditing(false);
      return;
    }
    const normalized = next.trim();
    if (!allowEmpty && !normalized) {
      flashAction("Date is required.", "error");
      setDraft(initial);
      setEditing(false);
      return;
    }
    if (normalized === initial) {
      setEditing(false);
      return;
    }
    if (!confirmed) {
      setPendingValue(normalized);
      setConfirmOpen(true);
      return;
    }
    startTransition(async () => {
      const result = await updatePolicyField({
        policyId,
        fieldKey,
        value: normalized,
        confirmed: true,
      });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        setDraft(initial);
        setEditing(false);
        setConfirmOpen(false);
        setPendingValue(null);
        return;
      }
      flashAction("Saved");
      setEditing(false);
      setConfirmOpen(false);
      setPendingValue(null);
    });
  }

  return (
    <div data-ff-policy-inline={fieldKey}>
      <dt className="text-helper text-muted-foreground">{label}</dt>
      <dd className="font-medium text-navy">
        {readOnly ? (
          display
        ) : editing ? (
          <input
            autoFocus
            type="date"
            className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => persist(draft)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(initial);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className={cn(
              "w-full rounded-sm px-0.5 text-left hover:bg-[#002868]/5",
              display === "—" && "text-muted-foreground",
            )}
            onClick={() => setEditing(true)}
          >
            {display}
          </button>
        )}
      </dd>
      <PolicySensitiveConfirmDialog
        open={confirmOpen}
        title={`Confirm ${label.toLowerCase()} change`}
        description={sensitiveFieldConfirmCopy(fieldKey)}
        pending={pending}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingValue(null);
          setDraft(initial);
          setEditing(false);
        }}
        onConfirm={() => {
          if (pendingValue != null) persist(pendingValue, true);
        }}
      />
    </div>
  );
}

export function PolicyInlineStatus({
  policyId,
  value,
  options,
  readOnly = false,
  /** Header chip next to section title — no Status label. */
  variant = "field",
}: {
  policyId: string;
  value: string;
  options: readonly string[];
  readOnly?: boolean;
  variant?: "field" | "header";
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function persist(next: string) {
    if (readOnly || next === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updatePolicyField({
        policyId,
        fieldKey: "status",
        value: next,
      });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        setEditing(false);
        return;
      }
      flashAction("Saved");
      setEditing(false);
    });
  }

  const chip = readOnly ? (
    <PolicyStatusBadge status={value} />
  ) : editing ? (
    <select
      autoFocus
      className={cn(
        "h-8 rounded-md border border-input bg-card px-2 text-sm",
        variant === "header" ? "w-auto min-w-[7rem]" : "w-full",
      )}
      defaultValue={value}
      disabled={pending}
      onBlur={(e) => persist(e.target.value)}
      onChange={(e) => persist(e.target.value)}
      aria-label="Status"
    >
      <option value="">None</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  ) : (
    <button type="button" className="rounded-sm hover:bg-[#002868]/5" onClick={() => setEditing(true)}>
      <PolicyStatusBadge status={value} />
    </button>
  );

  if (variant === "header") {
    return (
      <div className="inline-flex items-center" data-ff-policy-inline="status" data-ff-status-header="">
        {chip}
      </div>
    );
  }

  return (
    <div data-ff-policy-inline="status">
      <dt className="text-helper text-muted-foreground">Status</dt>
      <dd className="font-medium text-navy">{chip}</dd>
    </div>
  );
}

export function PolicyCarrierLookup({
  policyId,
  carrierId,
  carrierName,
  readOnly = false,
}: {
  policyId: string;
  carrierId?: string | null;
  carrierName?: string | null;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(carrierName ?? "");
  const [hits, setHits] = useState<{ id: string; name: string }[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setQ(carrierName ?? "");
  }, [carrierName]);

  useEffect(() => {
    if (!editing) return;
    const needle = q.trim();
    if (needle.length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    void searchCarriersForPolicyLink(needle).then((rows) => {
      if (!cancelled) setHits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [editing, q]);

  function pick(row: { id: string; name: string }) {
    startTransition(async () => {
      const result = await updatePolicyField({
        policyId,
        fieldKey: "carrierId",
        value: row.id,
      });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        return;
      }
      flashAction("Saved");
      setEditing(false);
      setQ(row.name);
    });
  }

  function clearCarrier() {
    startTransition(async () => {
      const result = await updatePolicyField({
        policyId,
        fieldKey: "carrierId",
        value: "",
      });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        return;
      }
      flashAction("Saved");
      setEditing(false);
      setQ("");
    });
  }

  return (
    <div data-ff-policy-inline="carrier" className="relative">
      <dt className="text-helper text-muted-foreground">Carrier</dt>
      <dd className="font-medium text-navy">
        {readOnly ? (
          carrierId ? (
            <Link href={`/carriers/${carrierId}`} className="text-primary hover:underline">
              {carrierName ?? "Carrier"}
            </Link>
          ) : (
            "—"
          )
        ) : editing ? (
          <div className="space-y-1">
            <input
              autoFocus
              className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              value={q}
              disabled={pending}
              placeholder="Search carriers…"
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => {
                window.setTimeout(() => setEditing(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
              }}
            />
            {hits.length > 0 ? (
              <ul className="absolute z-20 mt-0.5 max-h-40 w-full overflow-auto rounded-md border border-border bg-card shadow-md">
                <li>
                  <button
                    type="button"
                    className="block w-full px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-[#002868]/5"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={clearCarrier}
                  >
                    None
                  </button>
                </li>
                {hits.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="block w-full px-2 py-1.5 text-left text-sm hover:bg-[#002868]/5"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(row)}
                    >
                      {row.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {carrierId ? (
              <Link href={`/carriers/${carrierId}`} className="text-primary hover:underline">
                {carrierName ?? "Carrier"}
              </Link>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
            <button
              type="button"
              className="text-xs font-medium text-[#002868] underline-offset-2 hover:underline"
              onClick={() => setEditing(true)}
            >
              Change
            </button>
          </div>
        )}
      </dd>
    </div>
  );
}
