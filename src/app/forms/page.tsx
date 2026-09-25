import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { loadAgencyLobs } from "@/lib/db/line-settings";
import { getLastQuoteSheetDealId, listFormTemplates } from "@/lib/db/queries";
import { labelForLobCode, uniqueLobCodes } from "@/lib/desk/agency-lobs";
import { ELENA_DEAL_ID } from "@/lib/fixtures/ids";

export const dynamic = "force-dynamic";

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>;
}) {
  const { dealId: requestedDealId } = await searchParams;
  const [templates, lastSheetDealId, catalog] = await Promise.all([
    listFormTemplates(),
    getLastQuoteSheetDealId(),
    loadAgencyLobs().catch(() => []),
  ]);
  const dealId = requestedDealId || lastSheetDealId || ELENA_DEAL_ID;
  const allowedCodes = new Set(uniqueLobCodes(catalog));
  const visibleTemplates =
    allowedCodes.size === 0
      ? templates
      : templates.filter((template) => allowedCodes.has((template.line ?? "").trim().toUpperCase()));

  return (
    <AppShell title="Forms">

        {visibleTemplates.length === 0 ? (
          <p className="text-base text-muted-foreground">No form templates.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {visibleTemplates.map((template) => (
              <li key={template.id} className="ff-card p-4">
                <div className="text-[11px] uppercase text-muted-foreground">
                  {template.family} · {labelForLobCode(catalog, template.line)}
                </div>
              <h2 className="text-base font-semibold text-navy">{template.name}</h2>
              <p className="mt-1 text-base text-muted-foreground">{template.summary}</p>
              <Link
                href={`/forms/${template.slug}?dealId=${dealId}`}
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                Fill from open Quote Sheet
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
