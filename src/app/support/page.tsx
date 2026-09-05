import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return (
    <AppShell title="Help">
      <section className="ff-card max-w-xl space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">Desk help</h2>
        <p className="text-sm text-muted-foreground">
          How-to and Q&amp;A live in the help panel on the desk. Open it from the question-mark
          control, or jump into Settings for agency chrome and connections.
        </p>
        <p className="text-sm">
          <Link href="/?support=howto" className="text-primary hover:underline">
            Open help on Home
          </Link>
          {" · "}
          <Link href="/settings" className="text-primary hover:underline">
            Settings
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
