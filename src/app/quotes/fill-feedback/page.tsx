import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { listFillFeedbackLogs } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FillFeedbackPage() {
  const rows = await listFillFeedbackLogs();
  return (
    <AppShell
      title="Fill Feedback"
      actions={
        <Link href="/quotes" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to quotes
        </Link>
      }
    >

      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No fill corrections yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Doc type</th>
                <th>Field</th>
                <th>Wrong</th>
                <th>Corrected</th>
                <th>Why</th>
                <th>Deal</th>
                <th>Carrier</th>
                <th>Who</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ log, deal, carrier }) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs">
                    {log.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="uppercase text-xs">{log.docType.replaceAll("_", " ")}</td>
                  <td className="font-medium">{log.fieldKey.replaceAll("_", " ")}</td>
                  <td className="font-mono text-xs">{log.wrongValue}</td>
                  <td className="font-medium">{log.correctedValue}</td>
                  <td className="uppercase text-[11px]">{log.reason.replaceAll("_", " ")}</td>
                  <td>
                    {deal ? (
                      <Link href={`/deals/${deal.id}?tab=documents`} className="text-primary hover:underline">
                        {deal.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{carrier?.name ?? "—"}</td>
                  <td className="text-xs">{log.createdBy ?? "desk"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
