import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

const CARDS = [
  { href: "/settings/agents", title: "People", body: "Create, freeze, and recover logins." },
  { href: "/settings/billing", title: "Billing", body: "No SaaS invoicing on this desk." },
  { href: "/compliance", title: "Compliance", body: "E&O trail, including every Switch role." },
  { href: "/settings/integrations", title: "Integrations", body: "BYO catalog. Agency pays the vendor." },
  { href: "/automations", title: "Automations", body: "Playbooks, sequences, and developer tools." },
  { href: "/settings/email-triggers", title: "Triggers", body: "Won-date jobs. Nothing sends." },
  { href: "/settings#commission", title: "Commission rates", body: "Optional line hints on agency Settings." },
  { href: "/settings/lines", title: "Lines of business", body: "Agency catalog for deals, policies, and forms." },
  { href: "/settings/email-templates", title: "Email templates", body: "System + custom library. Not Documents. Not Tasks." },
  { href: "/settings/offices", title: "Offices", body: "Desks, states, and who sits where." },
  { href: "/settings/agency", title: "Agency chrome", body: "Name, logo, and the inherited signature." },
];

export default async function AdminHubPage() {
  await requireAdminPage();
  return (
    <AppShell title="Admin" eyebrow="Agency">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Agency-only tools. Agents never see this folder, billing, people, or carrier credentials.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
