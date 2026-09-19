import Link from "next/link";
import { FileStack, Mail, PenLine, LayoutTemplate } from "lucide-react";

const EMAIL = [
  {
    href: "/automations/templates",
    title: "Email templates",
    body: "System + custom library. Admin edits. Agents preview.",
    meta: "Admin library",
    icon: Mail,
  },
  {
    href: "/settings/email-signatures",
    title: "Agency signature",
    body: "One agency-owned close. Live preview and {{signature}} merge.",
    meta: "Admin",
    icon: PenLine,
  },
  {
    href: "/me?section=signature",
    title: "My close",
    body: "Personal override. Empty inherits the agency signature.",
    meta: "This login",
    icon: PenLine,
  },
] as const;

const DOCUMENTS = [
  {
    href: "/documents?library=forms",
    title: "Documents",
    body: "Folders by type. Carriers nest inside ACORD, AOR, and flyers.",
    meta: "Type → carrier",
    icon: FileStack,
  },
  {
    href: "/documents?library=forms",
    title: "Fill + eSign",
    body: "Confirm a filled carrier form, then send via DocuSign sandbox or the in-desk test path.",
    meta: "Confirm · send",
    icon: FileStack,
  },
] as const;

const OTHER = [
  {
    href: "/contacts",
    title: "Layout templates",
    body: "Contact and account layout presets. Not email. Not Documents.",
    meta: "Presets",
    icon: LayoutTemplate,
  },
] as const;

function Section({
  id,
  kicker,
  title,
  intro,
  cards,
}: {
  id: string;
  kicker: string;
  title: string;
  intro: string;
  cards: readonly {
    href: string;
    title: string;
    body: string;
    meta: string;
    icon: typeof Mail;
  }[];
}) {
  return (
    <section id={id} className="space-y-3" data-ff-templates-section={id}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{kicker}</p>
        <h2 className="text-lg font-semibold text-navy">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{intro}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={`${card.href}-${card.title}`}
              href={card.href}
              className="ff-card group flex flex-col gap-3 p-4 hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-fit-check-bg text-navy">
                  <Icon className="size-4" />
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {card.meta}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy group-hover:text-primary">{card.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function TemplatesHub() {
  return (
    <div className="space-y-8">
      <Section
        id="email"
        kicker="Email"
        title="Email"
        intro="Templates and signatures stay together. Documents never appear in this list."
        cards={EMAIL}
      />
      <Section
        id="documents"
        kicker="Documents"
        title="Documents"
        intro="Forms and the shared library, grouped by type with the carrier nested inside."
        cards={DOCUMENTS}
      />
      <Section
        id="other"
        kicker="Other"
        title="Other templates"
        intro="Layout presets and macros stay labeled here so they are not mixed into Email."
        cards={OTHER}
      />
    </div>
  );
}
