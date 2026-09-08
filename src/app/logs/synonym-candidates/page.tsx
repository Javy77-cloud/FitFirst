import Link from "next/link";
import {
  approveSynonymCandidate,
  markSynonymCandidateShipped,
  rejectSynonymCandidate,
} from "@/app/actions/synonym-candidates";
import { AppShell } from "@/components/app-shell";
import { LogsTabs } from "@/components/logs/logs-tabs";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { listSynonymCandidateQueue } from "@/lib/extraction/audit";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SynonymCandidatesPage() {
  await requireAdminPage();
  const rows = await listSynonymCandidateQueue();

  return (
    <AppShell
      title="Synonym candidates"
      actions={
        <Link href="/logs/fill-learning" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Fill Learning
        </Link>
      }
    >
      <LogsTabs current="synonym-candidates" />
      <p className="mb-3 text-sm text-muted-foreground">
        Queue when times_seen is at least 2. Approve sets status only — it does not edit
        synonyms.ts. Mark shipped after a PR lands the dictionary change.
      </p>
      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No candidates with times_seen at least 2 yet. Corrections with miss_reason
            no_synonym or no_delimiter bump this queue.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Proposed synonym</th>
                <th>Seen</th>
                <th>Status</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <SheetTbody>
              {rows.map((row) => (
                <tr key={row.id} id={`syn-cand-${row.id}`}>
                  <td className="font-medium">{row.fieldKey}</td>
                  <td>{row.proposedSynonym}</td>
                  <td>{row.timesSeen}</td>
                  <td>{row.status}</td>
                  <td className="text-xs text-muted-foreground">{row.note ?? "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {row.status === "proposed" || row.status === "rejected" ? (
                        <form action={approveSynonymCandidate}>
                          <input type="hidden" name="id" value={row.id} />
                          <Button type="submit" size="xs" variant="outline">
                            Approve
                          </Button>
                        </form>
                      ) : null}
                      {row.status === "proposed" || row.status === "approved" ? (
                        <form action={rejectSynonymCandidate}>
                          <input type="hidden" name="id" value={row.id} />
                          <Button type="submit" size="xs" variant="ghost">
                            Reject
                          </Button>
                        </form>
                      ) : null}
                      {row.status === "approved" ? (
                        <form action={markSynonymCandidateShipped}>
                          <input type="hidden" name="id" value={row.id} />
                          <Button type="submit" size="xs">
                            Mark shipped (PR done)
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </SheetTbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
