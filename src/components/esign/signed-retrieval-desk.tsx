import Link from "next/link";
import { SignedRetrievalActions } from "@/components/esign/signed-retrieval-actions";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import {
  SIGNED_FORM_TYPE_LABELS,
  SIGNED_FORM_TYPES,
  SIGNED_STATUS_LABELS,
  SIGNED_STATUSES,
  type SignedRetrievalFilters,
  type SignedRetrievalRow,
} from "@/lib/esign/retrieval";
import { ESIGN_LIST_COLUMNS } from "@/lib/list-columns";
import { cn } from "@/lib/utils";

function recordLinks(row: SignedRetrievalRow) {
  const links: { href: string; label: string }[] = [];
  if (row.dealId) links.push({ href: `/deals/${row.dealId}?tab=documents`, label: row.dealTitle || "Deal" });
  if (row.policyId) {
    links.push({ href: `/policies/${row.policyId}`, label: row.policyNumber || "Policy" });
  }
  if (links.length === 0) return "—";
  return (
    <div className="flex flex-col gap-0.5">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="text-primary hover:underline">
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function SignedRetrievalDesk({
  rows,
  filters,
}: {
  rows: SignedRetrievalRow[];
  filters: SignedRetrievalFilters;
}) {
  return (
    <div className="space-y-4" data-ff-signed-desk="">
      <form method="get" className="ff-card grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_160px_200px_auto]">
        <label className="block text-xs font-medium text-navy">
          Client / signer
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search name"
            className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-navy">
          Status
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="">All statuses</option>
            {SIGNED_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SIGNED_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-navy">
          Form type
          <select
            name="form"
            defaultValue={filters.form ?? ""}
            className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="">All forms</option>
            {SIGNED_FORM_TYPES.map((form) => (
              <option key={form} value={form}>
                {SIGNED_FORM_TYPE_LABELS[form]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm">
            Filter
          </Button>
          {filters.q || filters.status || filters.form ? (
            <Link href="/esign" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <section className="ff-card overflow-hidden">
        <DeskColumnTable
          moduleId="esign-signed"
          columns={ESIGN_LIST_COLUMNS}
          empty="No envelopes yet. Send ACORD, No Run Loss, AOR, Cancellation, or an application from Documents."
          rows={rows.map((row) => ({
            key: row.id,
            cells: {
              signer: (
                <>
                  <div className="font-medium">{row.clientName || row.signerName || "Unnamed signer"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.signerEmail || row.filename || "—"}
                  </div>
                </>
              ),
              form: (
                <>
                  <div>{row.formLabel}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.provider === "docusign" ? "DocuSign" : row.provider === "in_desk" ? "In-desk" : row.provider}
                  </div>
                </>
              ),
              status: <StatusBadge status={row.status}>{row.statusLabel}</StatusBadge>,
              record: recordLinks(row),
              sent: formatDay(row.sentAt),
              actions: <SignedRetrievalActions row={row} />,
            },
          }))}
        />
      </section>
    </div>
  );
}
