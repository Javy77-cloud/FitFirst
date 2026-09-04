import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getLastQuoteSheetDealId, listFormTemplates } from "@/lib/db/queries";
import { ELENA_DEAL_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>;
}) {
  const { dealId: requestedDealId } = await searchParams;
  const [templates, lastSheetDealId] = await Promise.all([
    listFormTemplates(),
    getLastQuoteSheetDealId(),
  ]);
  const dealId = requestedDealId || lastSheetDealId || ELENA_DEAL_ID;

  return (
    <AppShell title="Forms">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Style-label catalog only — not a licensed ACORD product. These templates also live under{" "}
        <Link href="/documents?library=forms" className="text-primary hover:underline">
          Documents → Forms library
        </Link>{" "}
        (ACORD and Agency forms folders) with Scan &amp; suggest. This page still fills from the
        open Deal Quote Sheet.
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
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/forms/${template.slug}?dealId=${dealId}`}
                  className="text-primary hover:underline"
                >
                  Fill from open Quote Sheet
                </Link>
                <Link href={`/documents/fill/${template.slug}`} className="text-primary hover:underline">
                  Scan-to-fill workspace
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
