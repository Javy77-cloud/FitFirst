import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SmartSearch } from "@/components/smart-search";
import { smartSearch } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const hits = q.trim() ? await smartSearch(q) : [];

  return (
    <AppShell title="Smart Search">
      <div className="mb-4 ff-card p-4">
        <SmartSearch defaultQuery={q} />
        <p className="mt-2 text-base text-muted-foreground">
          Finds Lead, Deal, Contact, Business, and Policy by name. Quotes are not coverage.
        </p>
      </div>
      {!q.trim() ? (
        <p className="text-base text-muted-foreground">Type Elena, Harbor, HO3-ELENA, or Ana.</p>
      ) : hits.length === 0 ? (
        <p className="text-base text-muted-foreground">No records for “{q}”.</p>
      ) : (
        <ul className="ff-card divide-y divide-border">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`} className="px-4 py-3">
              <div className="text-[11px] uppercase text-muted-foreground">{hit.kind}</div>
              <Link href={hit.href} className="font-medium text-primary hover:underline">
                {hit.title}
              </Link>
              <div className="text-base text-muted-foreground">{hit.subtitle}</div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
