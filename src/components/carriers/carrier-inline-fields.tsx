"use client";

import { useEffect, useState, useTransition } from "react";
import { updateCarrierField } from "@/app/actions/carriers-ops";
import { flashAction } from "@/lib/flash-client";
import { LINES } from "@/lib/domain";
import { formatDisplayDate } from "@/lib/dates/display-format";
import { cn } from "@/lib/utils";

type FieldKind = "text" | "select" | "lines" | "textarea" | "date";

type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
};

function displayValue(value: string | null | undefined, kind?: FieldKind) {
  const v = (value ?? "").trim();
  if (!v) return "—";
  if (kind === "date") return formatDisplayDate(v);
  return v;
}

function InlineRow({
  carrierId,
  field,
  value,
  admin,
}: {
  carrierId: string;
  field: FieldDef;
  value: string;
  admin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function persist(next: string) {
    if (!admin) {
      setEditing(false);
      return;
    }
    if (next.trim() === (value ?? "").trim()) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updateCarrierField({
        carrierId,
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

  if (!admin) {
    return (
      <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-start gap-2 border-b border-border/70 py-1.5 last:border-b-0">
        <div className="text-xs font-medium text-muted-foreground">{field.label}</div>
        <div className="whitespace-pre-wrap text-sm text-[#002868]">{displayValue(value, field.kind)}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-2 border-b border-border/70 py-1.5 last:border-b-0",
        pending && "opacity-60",
      )}
      data-ff-carrier-inline-row={field.key}
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
          >
            <option value="">None</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : field.kind === "textarea" ? (
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-[#002868]"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => persist(draft)}
          />
        ) : field.kind === "date" ? (
          <input
            type="date"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-[#002868]"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => persist(draft)}
          />
        ) : (
          <input
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
              if (e.key === "Enter") persist(draft);
            }}
          />
        )
      ) : (
        <button
          type="button"
          className="rounded px-1 py-0.5 text-left text-sm text-[#002868] hover:bg-secondary/60"
          onClick={() => setEditing(true)}
        >
          {displayValue(value, field.kind)}
        </button>
      )}
    </div>
  );
}

const IDENTITY_FIELDS: FieldDef[] = [
  { key: "name", label: "Carrier name", kind: "text" },
  { key: "agency_code", label: "Agency code", kind: "text" },
  { key: "website", label: "Website", kind: "text" },
  { key: "phone", label: "Phone", kind: "text" },
  { key: "email", label: "Email", kind: "text" },
  { key: "mailing_address", label: "Mailing address", kind: "text" },
  { key: "written_lines", label: "Written lines", kind: "text" },
  { key: "status", label: "Status", kind: "select", options: ["Active", "Pending", "Inactive"] },
];

const AM_BEST_FIELDS: FieldDef[] = [
  { key: "am_best_rating", label: "Rating", kind: "text" },
  { key: "am_best_outlook", label: "Outlook", kind: "text" },
  { key: "am_best_date", label: "Date", kind: "date" },
];

export function CarrierIdentityFields({
  carrierId,
  values,
  admin,
}: {
  carrierId: string;
  values: Record<string, string>;
  admin: boolean;
}) {
  return (
    <div className="space-y-0" data-ff-carrier-identity="">
      {IDENTITY_FIELDS.map((field) => (
        <InlineRow
          key={field.key}
          carrierId={carrierId}
          field={field}
          value={values[field.key] ?? ""}
          admin={admin}
        />
      ))}
      <p className="pt-2 text-[11px] text-muted-foreground">
        Lines hint: {LINES.join(", ")} (comma-separated).
      </p>
    </div>
  );
}

const CONTACT_GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Underwriter",
    fields: [
      { key: "underwriter_name", label: "Name", kind: "text" },
      { key: "underwriter_phone", label: "Phone", kind: "text" },
      { key: "underwriter_email", label: "Email", kind: "text" },
    ],
  },
  {
    title: "Claims contact",
    fields: [
      { key: "claims_contact_name", label: "Name", kind: "text" },
      { key: "claims_phone", label: "Phone", kind: "text" },
      { key: "claims_contact_email", label: "Email", kind: "text" },
    ],
  },
  {
    title: "Marketing contact",
    fields: [
      { key: "marketing_contact_name", label: "Name", kind: "text" },
      { key: "marketing_contact_phone", label: "Phone", kind: "text" },
      { key: "marketing_contact_email", label: "Email", kind: "text" },
    ],
  },
];

export function CarrierContactFields({
  carrierId,
  values,
  admin,
}: {
  carrierId: string;
  values: Record<string, string>;
  admin: boolean;
}) {
  return (
    <div className="space-y-4" data-ff-carrier-contact="">
      {CONTACT_GROUPS.map((group) => (
        <div key={group.title} className="rounded-md border border-border/70 px-3 py-2" data-ff-carrier-contact-group={group.title}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#002868]">
            {group.title}
          </div>
          {group.fields.map((field) => (
            <InlineRow
              key={field.key}
              carrierId={carrierId}
              field={field}
              value={values[field.key] ?? ""}
              admin={admin}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CarrierRichTextField({
  carrierId,
  fieldKey,
  value,
  admin,
}: {
  carrierId: string;
  fieldKey: string;
  value: string;
  admin: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!admin) {
    return (
      <div className="whitespace-pre-wrap text-sm text-[#002868]" data-ff-carrier-rich={fieldKey}>
        {displayValue(value)}
      </div>
    );
  }

  return (
    <div className={cn(pending && "opacity-60")} data-ff-carrier-rich={fieldKey}>
      <textarea
        className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-[#002868]"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim() === (value ?? "").trim()) return;
          startTransition(async () => {
            const result = await updateCarrierField({
              carrierId,
              fieldKey,
              value: draft,
            });
            if (!result.ok) {
              flashAction(result.error ?? "Could Not Save", "error");
              setDraft(value);
              return;
            }
            flashAction("Saved");
          });
        }}
      />
    </div>
  );
}

export function CarrierAmBestFields({
  carrierId,
  values,
  admin,
}: {
  carrierId: string;
  values: Record<string, string>;
  admin: boolean;
}) {
  return (
    <div className="space-y-0" data-ff-carrier-ambest="">
      {AM_BEST_FIELDS.map((field) => (
        <InlineRow
          key={field.key}
          carrierId={carrierId}
          field={field}
          value={values[field.key] ?? ""}
          admin={admin}
        />
      ))}
    </div>
  );
}

export function CarrierPortalUrlField({
  carrierId,
  value,
  admin,
}: {
  carrierId: string;
  value: string;
  admin: boolean;
}) {
  return (
    <div className="mb-3">
      <InlineRow
        carrierId={carrierId}
        field={{ key: "portal_url", label: "Portal URL", kind: "text" }}
        value={value}
        admin={admin}
      />
    </div>
  );
}
