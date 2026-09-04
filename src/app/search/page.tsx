import Link from "next/link";
import { AppShell } from "@/components/app-shell";
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
    <AppShell title="Search">
      <p className="mb-3 text-sm text-muted-foreground">
        Use Smart Search in the header. Finds Lead, Deal, Contact, Business, and Policy by name.
        Quotes are not coverage.
      </p>
      {!q.trim() ? (
        <p className="text-sm text-muted-foreground">Type Elena, Harbor, HO3-ELENA, or Ana.</p>
      ) : hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No records for “{q}”.</p>
      ) : (
        <ul className="ff-card divide-y divide-border">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`} className="px-4 py-3">
              <div className="text-[11px] uppercase text-muted-foreground">{hit.kind}</div>
              <Link href={hit.href} className="font-medium text-primary hover:underline">
                {hit.title}
              </Link>
              <div className="text-xs text-muted-foreground">{hit.subtitle}</div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
