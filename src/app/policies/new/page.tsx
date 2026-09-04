import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function NewPolicyPage() {
  return (
    <AppShell title="Add Policy" eyebrow="Quick action">
      <section className="ff-card max-w-xl space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">Policy from bind</h2>
        <p className="text-sm text-muted-foreground">
          Policies exist only after a deal is bound. Quotes are not coverage. Open a shopping deal
          and bind to a Contact or Business — do not invent a policy from a quote.
        </p>
        <p className="text-sm">
          <Link href="/deals/new" className="text-primary hover:underline">
            Start a shopping deal
          </Link>
          {" · "}
          <Link href="/deals" className="text-primary hover:underline">
            Open deals
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          Ana Dib stays Quote Sent / unbound, Cov A $321,000. Do not bind her from this stub.
        </p>
      </section>
    </AppShell>
  );
}
