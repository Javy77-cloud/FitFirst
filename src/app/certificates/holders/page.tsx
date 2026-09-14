import Link from "next/link";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { archiveHolderContact } from "@/app/actions/ams";
import { AppShell } from "@/components/app-shell";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { CERTIFICATE_HOLDERS_COLUMNS } from "@/lib/list-columns";
import { HolderContactForm } from "@/components/ams/holder-contact-form";
import { Button } from "@/components/ui/button";
import { certificateFlagLabels } from "@/lib/ams/certificate-holders";
import { formatHolderContactAddress, formatHolderContactLine } from "@/lib/ams/holder-contacts";
import { ACORD_STUB_DISCLAIMER } from "@/lib/ams/coi-requests";
import { HOLDER_CONTACT_DISCLAIMER, holderContactStatusLabel } from "@/lib/domain-ams";
import { listCertificateHolders, listHolderContacts } from "@/lib/ams/queries";
import { HARBOR_ACCOUNT_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function CertificateHoldersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = params.status === "archived" ? "archived" : params.status === "all" ? undefined : "active";
  const editId = typeof params.edit === "string" ? params.edit : undefined;
  const [holders, contacts] = await Promise.all([
    listCertificateHolders(),
    listHolderContacts(status),
  ]);
  const editing = contacts.find(({ contact }) => contact.id === editId)?.contact ?? null;
  const error = typeof params.error === "string" ? params.error : undefined;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AppShell title="Certificate holders">
      <p className="mb-4 text-base text-muted-foreground">
        {HOLDER_CONTACT_DISCLAIMER} {ACORD_STUB_DISCLAIMER}
      </p>
      <DeskPageTrail
        fallbackHref="/certificates"
        crumbs={[
          { href: "/certificates", label: "Certificates" },
          { label: "Holders" },
        ]}
      />
      <p className="mb-4 text-sm">
        <Link href="/certificates/holders" className="text-primary hover:underline">
          Active contacts
        </Link>
        {" · "}
        <Link href="/certificates/holders?status=archived" className="text-primary hover:underline">
          Archived
        </Link>
        {" · "}
        <Link href="/certificates/holders?status=all" className="text-primary hover:underline">
          All
        </Link>
      </p>
      {error ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-navy">Holder {notice.replaceAll("_", " ")}.</p>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="ff-card p-4">
          <h2 className="text-base font-semibold text-navy">
            {editing ? `Edit ${editing.name}` : "Add a holder contact"}
          </h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Default Business is Harbor Key Marine. Saving a name does not issue the stub.
          </p>
          <HolderContactForm accountId={HARBOR_ACCOUNT_ID} contact={editing} />
          {editing ? (
            <p className="mt-2 text-sm">
              <Link href="/certificates/holders" className="text-primary hover:underline">
                Cancel edit
              </Link>
            </p>
          ) : null}
        </section>
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
            Holder contacts
          </div>
          {contacts.length === 0 ? (
            <p className="px-4 py-6 text-base text-muted-foreground">
              No holder contacts in this view. Add Palm Bay or Brevard from the form.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {contacts.map(({ contact, account }) => (
                <li key={contact.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-navy">{formatHolderContactLine(contact)}</span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {holderContactStatusLabel(contact.status)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {account?.name ?? "No Business"}
                    {formatHolderContactAddress(contact)
                      ? ` · ${formatHolderContactAddress(contact)}`
                      : ""}
                  </p>
                  {contact.notes ? (
                    <p className="text-sm text-muted-foreground">{contact.notes}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/certificates/holders?edit=${contact.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    {contact.status === "active" ? (
                      <form action={archiveHolderContact}>
                        <input type="hidden" name="contactId" value={contact.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          Archive
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Holders already on commercial Policies
        </div>
        <DeskColumnTable
          moduleId="certificate-holders"
          columns={CERTIFICATE_HOLDERS_COLUMNS}
          empty="No certificate holders on file. Queue a Harbor COI and optionally add the holder as AI."
          rows={holders.map((row) => ({
            key: row.name,
            cells: {
              holder: row.name,
              kind: row.kinds.join(" · ") || "—",
              business: row.accountName ?? "—",
              policies: row.policyNumbers.join(" · ") || "—",
              counts: `${row.openCoi} open · ${row.issuedStubs} issued`,
              flags: certificateFlagLabels(row).join(" · ") || "None on the stub",
            },
          }))}
        />
      </section>
    </AppShell>
  );
}
