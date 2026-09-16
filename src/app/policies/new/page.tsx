import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function NewPolicyPage() {
  return (
    <AppShell title="Add Policy" eyebrow="Quick action">
      <section className="ff-card max-w-xl space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">Policy from declaration</h2>
        <p className="text-sm text-muted-foreground">
          Desk work does not start with an empty policy. On a Bound deal, open Quotes and move the
          product to Policy issued — upload or pick the declaration, then confirm Gemini fields.
        </p>
        <p className="text-sm">
          <Link href="/deals" className="text-primary hover:underline">
            Open deals
          </Link>
          {" · "}
          <Link href="/deals/new" className="text-primary hover:underline">
            Start a shopping deal
          </Link>
        </p>
        <p className="text-helper text-muted-foreground">
          A policy is minted from the issued declaration — not from this shortcut.
        </p>
      </section>
    </AppShell>
  );
}
