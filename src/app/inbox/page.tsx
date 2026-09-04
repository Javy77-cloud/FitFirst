import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  return (
    <AppShell title="Inbox" eyebrow="Desk">
      <section className="ff-card max-w-xl p-4">
        <h2 className="text-base font-semibold text-navy">In-desk mail</h2>
        <p className="mt-2 text-base text-muted-foreground">
          There is no Gmail or carrier mail sync on this desk. Email and SMS you log on a deal or
          lead land on that record&apos;s Quick Communications board.
        </p>
      </section>
    </AppShell>
  );
}
