import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireSignedIn } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

const CARDS = [
  {
    href: "/me?section=signature",
    title: "Email signatures",
    body: "Your personal close. Agency signatures stay under Admin.",
  },
  {
    href: "/automations/templates",
    title: "Email templates",
    body: "EN/ES preview library. Sending still logs on the record.",
  },
  {
    href: "/documents",
    title: "Document templates",
    body: "Forms and the document library used on shops and files.",
  },
];

export default async function TemplatesHubPage() {
  await requireSignedIn();
  return (
    <AppShell title="Templates" eyebrow="Library">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Signatures, email templates, and document templates in one folder. Personal drafts live under
        the avatar Settings menu.
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
