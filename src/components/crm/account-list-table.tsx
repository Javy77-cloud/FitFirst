import Link from "next/link";
import { ColumnPicker } from "@/components/crm/column-picker";
import { LinkedValue } from "@/components/crm/linked-value";
import { accountDisplayName } from "@/lib/crm/bind";
import { formatTenure } from "@/lib/crm/display";
import type { Contact } from "@/lib/db/schema";

const PERSONAL = [
  { id: "name", header: "Contact name", defaultVisible: true, hideable: false },
  { id: "phone", header: "Phone", defaultVisible: true },
  { id: "email", header: "Email", defaultVisible: true },
  { id: "city", header: "City", defaultVisible: true },
  { id: "state", header: "State", defaultVisible: true },
  { id: "lifetime", header: "Lifetime policies", defaultVisible: true },
  { id: "active", header: "Active policies", defaultVisible: true },
  { id: "tenure", header: "Tenure", defaultVisible: true },
  { id: "notes", header: "Life / health notes", defaultVisible: false },
];

const BUSINESS = [
  { id: "legal", header: "Business name", defaultVisible: true, hideable: false },
  { id: "contact", header: "Contact name", defaultVisible: true },
  { id: "phone", header: "Phone", defaultVisible: true },
  { id: "email", header: "Email", defaultVisible: true },
  { id: "city", header: "City", defaultVisible: true },
  { id: "state", header: "State", defaultVisible: true },
  { id: "lifetime", header: "Lifetime policies", defaultVisible: true },
  { id: "active", header: "Active policies", defaultVisible: true },
  { id: "tenure", header: "Tenure", defaultVisible: true },
];

export function AccountListTable({
  rows,
  kind,
  empty,
}: {
  rows: Contact[];
  kind: "personal" | "commercial";
  empty: string;
}) {
  const columns = kind === "commercial" ? BUSINESS : PERSONAL;
  const tableId = kind === "commercial" ? "businesses" : "contacts";

  return (
    <ColumnPicker tableId={tableId} columns={columns}>
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} data-col={col.id}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((c) =>
                kind === "commercial" ? (
                  <tr key={c.id}>
                    <td data-col="legal" className="font-medium">
                      <Link href={`/contacts/${c.id}`} className="text-primary hover:underline">
                        {c.legalName?.trim() || accountDisplayName(c)}
                      </Link>
                    </td>
                    <td data-col="contact">
                      {c.lastName}, {c.firstName}
                    </td>
                    <td data-col="phone">
                      <LinkedValue value={c.phone} kind="tel" />
                    </td>
                    <td data-col="email">
                      <LinkedValue value={c.email} kind="email" />
                    </td>
                    <td data-col="city">{c.city ?? "—"}</td>
                    <td data-col="state">{c.state ?? "—"}</td>
                    <td data-col="lifetime">{c.policyCount}</td>
                    <td data-col="active">{c.activePolicyCount}</td>
                    <td data-col="tenure">{formatTenure(c.tenureStart)}</td>
                  </tr>
                ) : (
                  <tr key={c.id}>
                    <td data-col="name" className="font-medium">
                      <Link href={`/contacts/${c.id}`} className="text-primary hover:underline">
                        {accountDisplayName(c)}
                      </Link>
                    </td>
                    <td data-col="phone">
                      <LinkedValue value={c.phone} kind="tel" />
                    </td>
                    <td data-col="email">
                      <LinkedValue value={c.email} kind="email" />
                    </td>
                    <td data-col="city">{c.city ?? "—"}</td>
                    <td data-col="state">{c.state ?? "—"}</td>
                    <td data-col="lifetime">{c.policyCount}</td>
                    <td data-col="active">{c.activePolicyCount}</td>
                    <td data-col="tenure">{formatTenure(c.tenureStart)}</td>
                    <td data-col="notes">
                      {[c.lifeNotes, c.healthNotes].filter(Boolean).join(" · ") || "—"}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </section>
    </ColumnPicker>
  );
}

export function AccountFilters({
  pathname,
  q,
  state,
}: {
  pathname: string;
  q: string;
  state: string;
}) {
  return (
    <form method="get" action={pathname} className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-muted-foreground">
        Search
        <input
          name="q"
          defaultValue={q}
          placeholder="Name, phone, email"
          className="mt-1 block h-8 rounded-md border border-input bg-card px-2 text-sm text-navy"
        />
      </label>
      <label className="text-xs text-muted-foreground">
        State
        <input
          name="state"
          defaultValue={state}
          placeholder="FL"
          className="mt-1 block h-8 w-20 rounded-md border border-input bg-card px-2 text-sm text-navy"
        />
      </label>
      <button
        type="submit"
        className="h-8 rounded-md bg-navy px-3 text-xs font-medium text-white"
      >
        Apply
      </button>
      {q || state ? (
        <a href={pathname} className="h-8 px-2 text-xs leading-8 text-primary hover:underline">
          Clear
        </a>
      ) : null}
    </form>
  );
}

export function filterAccounts(rows: Contact[], q: string, state: string) {
  const query = q.trim().toLowerCase();
  const st = state.trim().toUpperCase();
  return rows.filter((row) => {
    if (st && (row.state ?? "").toUpperCase() !== st) return false;
    if (!query) return true;
    const hay = [row.firstName, row.lastName, row.legalName, row.email, row.phone, row.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  });
}
