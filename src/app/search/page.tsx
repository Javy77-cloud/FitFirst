import { AppShell } from "@/components/app-shell";
import { LiveSearchResults } from "@/components/search/live-search-results";
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

      </div>
      <LiveSearchResults initialQuery={q} initialHits={hits} />
    </AppShell>
  );
}
