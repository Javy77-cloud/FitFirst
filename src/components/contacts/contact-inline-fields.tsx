"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { EditLayoutLink } from "@/components/custom-fields/edit-layout-link";
import { updateContactField } from "@/app/actions/contacts-ops";
import {
  CONTACT_EDUCATION_OPTIONS,
  CONTACT_EMPLOYMENT_OPTIONS,
  CONTACT_MARITAL_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  CONTACT_TIME_OPTIONS,
} from "@/lib/contacts/contact-field-catalog";
import { softEmailPhoneDups } from "@/lib/contacts/soft-dup";
import { flashAction } from "@/lib/flash-client";
import { formatDisplayDate } from "@/lib/dates/display-format";
import { cn } from "@/lib/utils";

type FieldKind = "text" | "date" | "select";

type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
};

function buildFields(occupationOptions: readonly string[]): FieldDef[] {
  return [
    { key: "first_name", label: "First Name", kind: "text" },
    { key: "last_name", label: "Last Name", kind: "text" },
    { key: "email", label: "Email", kind: "text" },
    { key: "phone", label: "Phone", kind: "text" },
    { key: "date_of_birth", label: "DOB", kind: "date" },
    {
      key: "occupation",
      label: "Occupation",
      kind: "select",
      options: occupationOptions,
    },
    { key: "education_level", label: "Education", kind: "select", options: CONTACT_EDUCATION_OPTIONS },
    { key: "marital_status", label: "Marital", kind: "select", options: CONTACT_MARITAL_OPTIONS },
    {
      key: "employment_status",
      label: "Employment",
      kind: "select",
      options: CONTACT_EMPLOYMENT_OPTIONS,
    },
    {
      key: "preferred_contact_method",
      label: "Preferred Contact Method",
      kind: "select",
      options: CONTACT_METHOD_OPTIONS,
    },
    {
      key: "preferred_contact_time",
      label: "Preferred Contact Time",
      kind: "select",
      options: CONTACT_TIME_OPTIONS,
    },
    { key: "mailing_address", label: "Address", kind: "text" },
    { key: "city", label: "City", kind: "text" },
    { key: "state", label: "State", kind: "text" },
    { key: "zip", label: "ZIP", kind: "text" },
  ];
}

function displayValue(value: string | null | undefined, kind?: FieldKind) {
  const v = (value ?? "").trim();
  if (!v) return "—";
  if (kind === "date") return formatDisplayDate(v);
  return v;
}

type BookRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

function InlineRow({
  contactId,
  field,
  value,
  book,
  onDup,
  currentEmail,
  currentPhone,
}: {
  contactId: string;
  field: FieldDef;
  value: string;
  book: BookRow[];
  onDup: (rows: BookRow[]) => void;
  currentEmail?: string;
  currentPhone?: string;
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
    if (field.key === "email" || field.key === "phone") {
      const hits = softEmailPhoneDups(book, {
        id: contactId,
        email: field.key === "email" ? next : currentEmail,
        phone: field.key === "phone" ? next : currentPhone,
      });
      onDup(hits);
    }
    startTransition(async () => {
      const result = await updateContactField({
        contactId,
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
      data-ff-contact-inline-row={field.key}
    >
      <div className="text-xs font-medium text-muted-foreground">{field.label}</div>
      {editing ? (
        field.kind === "select" ? (
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-[#002868]"
            value={draft}
            autoFocus
            onChange={(e) => {
              setDraft(e.target.value);
              // Save on change for selects (blur can miss native select in some browsers)
              persist(e.target.value);
            }}
            onBlur={() => persist(draft)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
            }}
          >
            <option value="">None</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.kind === "date" ? "date" : "text"}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-[#002868]"
            value={draft}
            autoFocus
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
        )
      ) : (
        <button
          type="button"
          className="min-h-8 rounded px-1.5 text-left text-sm text-[#002868] hover:bg-muted"
          onClick={() => setEditing(true)}
          data-ff-contact-inline-edit={field.key}
        >
          {displayValue(draft, field.kind)}
        </button>
      )}
    </div>
  );
}

export function ContactInlineFields({
  contactId,
  values,
  occupationOptions = [],
  book = [],
}: {
  contactId: string;
  values: Record<string, string>;
  /** From global Occupations picklist — never hardcoded in this component. */
  occupationOptions?: readonly string[];
  book?: BookRow[];
}) {
  const fields = buildFields(occupationOptions);
  const [editDups, setEditDups] = useState<BookRow[]>([]);

  return (
    <section id="contact-details" className="ff-card p-3 scroll-mt-4" data-ff-contact-inline-fields="">
      <div className="mb-2 flex items-center justify-between gap-3" data-ff-contact-details-header="">
        <h2 className="text-base font-semibold text-[#002868]">Contact Details</h2>
        <div className="shrink-0" data-ff-contact-edit-layout="">
          <EditLayoutLink module="contacts" />
        </div>
      </div>
      {editDups.length > 0 ? (
        <div
          className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          data-ff-contact-edit-dup-banner=""
          role="status"
        >
          Possible Duplicate
          {editDups.slice(0, 3).map((row) => (
            <span key={row.id}>
              :{" "}
              <Link href={`/contacts/${row.id}`} className="font-semibold underline">
                {row.lastName}, {row.firstName}
              </Link>
            </span>
          ))}
          . You can still save.
        </div>
      ) : null}
      <div className="space-y-0">
        {fields.map((field) => (
          <InlineRow
            key={field.key}
            contactId={contactId}
            field={field}
            value={values[field.key] ?? ""}
            book={book}
            onDup={setEditDups}
            currentEmail={values.email ?? ""}
            currentPhone={values.phone ?? ""}
          />
        ))}
      </div>
    </section>
  );
}
