"use client";

import { useEffect, useState, useTransition } from "react";
import { updateAccountField } from "@/app/actions/businesses-ops";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

type FieldKind = "text" | "number" | "select";

type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
};

const ENTITY_OPTIONS = [
  "LLC",
  "Corporation",
  "S-Corp",
  "Partnership",
  "Sole Proprietor",
  "Nonprofit",
  "Other",
] as const;

const FIELDS: FieldDef[] = [
  { key: "ein", label: "EIN", kind: "text" },
  { key: "entity_type", label: "Entity Type", kind: "select", options: ENTITY_OPTIONS },
  { key: "industry", label: "Industry", kind: "text" },
  { key: "annual_sales", label: "Annual Sales", kind: "text" },
  { key: "employee_count", label: "Employees", kind: "number" },
  { key: "payroll", label: "Payroll", kind: "text" },
  { key: "years_in_business", label: "Years In Business", kind: "number" },
];

function displayValue(value: string | null | undefined) {
  const v = (value ?? "").trim();
  return v || "—";
}

function InlineRow({
  accountId,
  field,
  value,
}: {
  accountId: string;
  field: FieldDef;
  value: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function persist(next: string) {
    if (next.trim() === (value ?? "").trim()) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updateAccountField({
        accountId,
        fieldKey: field.key,
        value: next,
      });
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
    <div
      className={cn(
        "grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-2 border-b border-border/70 py-1.5 last:border-b-0",
        pending && "opacity-60",
      )}
      data-ff-business-inline-row={field.key}
    >
      <div className="text-xs font-medium text-muted-foreground">{field.label}</div>
      {editing ? (
        field.kind === "select" ? (
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-[#002868]"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => persist(draft)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
            }}
          >
            <option value="">—</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.kind === "number" ? "number" : "text"}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-[#002868]"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => persist(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
            }}
          />
        )
      ) : (
        <button
          type="button"
          className="min-h-8 rounded px-1.5 text-left text-sm text-[#002868] hover:bg-muted"
          onClick={() => setEditing(true)}
          data-ff-business-inline-edit={field.key}
        >
          {displayValue(draft)}
        </button>
      )}
    </div>
  );
}

export function BusinessInlineFields({
  accountId,
  values,
}: {
  accountId: string;
  values: Record<string, string>;
}) {
  return (
    <section className="ff-card p-3" data-ff-business-inline-fields="">
      <h2 className="mb-2 text-base font-semibold text-[#002868]">Account 360</h2>
      <div className="space-y-0">
        {FIELDS.map((field) => (
          <InlineRow
            key={field.key}
            accountId={accountId}
            field={field}
            value={values[field.key] ?? ""}
          />
        ))}
      </div>
    </section>
  );
}
