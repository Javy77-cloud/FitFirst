import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ownerHomeDashboard } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const { snapshot } = await ownerHomeDashboard();

  return (
    <AppShell title="Work queue">
      <p className="mb-3 text-sm text-muted-foreground">
        Flags the owner should see today: open review tasks, lapses, and Bound files still waiting
        on issue. Nothing emails anyone.
      </p>
      <p className="mb-3 text-[12px]">
        <Link href="/" className="text-primary hover:underline">
          Back to home
        </Link>
      </p>
      <section className="ff-card overflow-hidden">
        {snapshot.attention.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Queue is clear.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Item</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.attention.map((item) => (
                <tr key={item.id}>
                  <td className="uppercase">{item.kind.replaceAll("_", " ")}</td>
                  <td>
                    <Link href={item.href} className="font-medium text-primary hover:underline">
                      {item.title}
                    </Link>
                  </td>
                  <td>{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
