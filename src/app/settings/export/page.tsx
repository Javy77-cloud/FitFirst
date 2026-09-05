import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { IMPORT_EXPORT_HUB_HREF, IMPORT_HREF } from "@/lib/settings/import-export";
import { requireAdminPage } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { listApiActivities, listApiCommissions, listApiContacts, listApiDeals, listApiPolicies } from "@/lib/api/v1/queries";
import { demoTokenPlaintext, FALLBACK_ADMIN, type ApiActor } from "@/lib/auth/api";

export const dynamic = "force-dynamic";

function actorFromSession(session: { userId: string | null; name: string; email: string | null; isAdmin: boolean }): ApiActor {
  return {
    id: session.userId ?? FALLBACK_ADMIN.id,
    name: session.name,
    email: session.email ?? FALLBACK_ADMIN.email,
    role: session.isAdmin ? "admin" : "agent",
    tenantId: DEFAULT_TENANT_ID,
  };
}

export default async function AdminExportPage() {
  const session = await requireAdminPage();
  const actor = actorFromSession(session);
  const [contacts, policies, deals, activities, commissions] = await Promise.all([
    listApiContacts(actor),
    listApiPolicies(actor),
    listApiDeals(actor),
    listApiActivities(actor),
    listApiCommissions(actor),
  ]);
  const demoToken = demoTokenPlaintext();

  const files = [
    {
      key: "contacts",
      title: "Contacts",
      href: "/api/v1/export/contacts.csv",
      count: contacts.length,
      hint: "Name, phone, email, mailing address, client status, policy counts.",
    },
    {
      key: "policies",
      title: "Policies",
      href: "/api/v1/export/policies.csv",
      count: policies.length,
      hint: "Policy number, line, status, premium, dates, contact, carrier.",
    },
    {
      key: "commissions",
      title: "Commissions",
      href: "/api/v1/export/commissions.csv",
      count: commissions.length,
      hint: "Amount, rate, status, due/paid dates, policy number.",
    },
  ] as const;

  return (
    <SettingsShell title="Export" current="export">
      <p className="mb-3 text-sm">
        <Link href={IMPORT_EXPORT_HUB_HREF} className="text-primary hover:underline">
          Import / Export hub
        </Link>
        <span className="text-muted-foreground"> · </span>
        <Link href={IMPORT_HREF} className="text-primary hover:underline">
          Import
        </Link>
      </p>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Download the book as CSV, or pull the same rows from <code className="font-mono text-xs">/api/v1</code>{" "}
        with a bearer token. For Admin CSV import plus the full entity pack, use the{" "}
        <Link href={IMPORT_EXPORT_HUB_HREF} className="text-primary hover:underline">
          Import / Export hub
        </Link>
        . Encrypted SSN / EIN / DL values stay off the file. Businesses, carriers, leads,
        documents, and quote sheets sit on the Import / Export hub.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {files.map((file) => (
          <section key={file.key} className="ff-card flex flex-col p-4">
            <div className="text-caption uppercase tracking-wide text-muted-foreground">{file.title}</div>
            <div className="mt-1 text-2xl font-semibold text-navy">{file.count}</div>
            <p className="mt-2 flex-1 text-helper text-muted-foreground">{file.hint}</p>
            <a
              href={file.href}
              className="mt-3 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Download CSV
            </a>
          </section>
        ))}
      </div>

      <section className="ff-card space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">Open API</h2>
        <p className="text-sm text-muted-foreground">
          List and get contacts, policies, deals, and activities. Same token as the CSV routes. Seeded demo
          token for Admin (Javy): <code className="font-mono text-xs">{demoToken}</code>
        </p>
        <ul className="space-y-1 text-sm text-navy">
          <li>
            JSON lists: {contacts.length} contacts · {policies.length} policies · {deals.length} deals ·{" "}
            {activities.length} activities
          </li>
          <li>
            <code className="font-mono text-xs">GET /api/v1/contacts</code>,{" "}
            <code className="font-mono text-xs">/policies</code>,{" "}
            <code className="font-mono text-xs">/deals</code>,{" "}
            <code className="font-mono text-xs">/activities</code> — add <code className="font-mono text-xs">/:id</code>{" "}
            for one record
          </li>
        </ul>
        <pre className="overflow-x-auto rounded-md bg-secondary/60 p-3 text-[11px] leading-5 text-navy">
{`curl -s http://127.0.0.1:43147/api/v1/me \\
  -H "Authorization: Bearer ${demoToken}"

curl -s http://127.0.0.1:43147/api/v1/contacts?q=Elena \\
  -H "Authorization: Bearer ${demoToken}"

curl -s http://127.0.0.1:43147/api/v1/export/policies.csv \\
  -H "Authorization: Bearer ${demoToken}" -o policies.csv`}
        </pre>
        <p className="text-helper text-muted-foreground">
          <code className="font-mono">POST /api/v1/auth/token</code> issues another hashed Admin bearer. Tokens
          live in <code className="font-mono">api_tokens</code>. Agents only see their own book.
        </p>
      </section>
    </SettingsShell>
  );
}
