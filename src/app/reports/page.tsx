import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireSignedIn } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

const CARDS = [
  {
    href: "/scorecards",
    title: "Scorecards",
    body: "Producer production and hit/lost on the book you can see.",
  },
  {
    href: "/glance",
    title: "Glance",
    body: "A short read of the book — policies, shops, and follow-ups.",
  },
  {
    href: "/commissions",
    title: "Commissions",
    body: "Pending and paid. Agents see their book. Admin sees the agency.",
  },
];

export default async function ReportsHubPage() {
  await requireSignedIn();
  return (
    <AppShell title="Reports" eyebrow="Book">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Reporting surfaces already on the desk. Nothing here writes a Policy or sends mail.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="ff-card space-y-1 p-4 hover:border-primary/40"
          >
            <h2 className="text-sm font-semibold text-navy">{card.title}</h2>
            <p className="text-sm text-muted-foreground">{card.body}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
