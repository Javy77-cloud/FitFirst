import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { listFormTemplates } from "@/lib/db/queries";
import { ELENA_DEAL_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const templates = await listFormTemplates();
  return (
    <AppShell title="Forms">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Style-label catalog only — not a licensed ACORD product. Fill from Quote Sheet copies
        matching keys from the Deal&apos;s <code>quote_sheets</code> row.
      </p>
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No form templates. Run db:seed.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <li key={template.id} className="ff-card p-4">
              <div className="text-[11px] uppercase text-muted-foreground">
                {template.family} · {template.line}
              </div>
              <h2 className="text-sm font-semibold text-navy">{template.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{template.summary}</p>
              <Link
                href={`/forms/${template.slug}?dealId=${ELENA_DEAL_ID}`}
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                Fill from Elena Quote Sheet
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
