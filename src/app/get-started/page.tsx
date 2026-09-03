import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { DEAL_ID, ELENA_ACCOUNT_ID, ELENA_CONTACT_ID, ELENA_DEAL_ID, ELENA_LEAD_ID, ELENA_POLICY_ID } from "@/lib/fixtures/ids";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "1. Open this checklist",
    body: "You are here. This is the TEST-DESK path. Settings / desk identity lives on the QA slice if that branch is merged.",
    href: "/get-started",
    cta: "Stay on Get Started",
  },
  {
    title: "2. Personal HO path (already bound)",
    body: "Leads → Ruiz, Elena → Open deal → Quote Sheet + source docs vs quote PDFs → Contact → HO3 policy. Lifetime 1, in-force 1, status Client. Linked business Ruiz Tile LLC has zero commercial policies.",
    href: `/leads/${ELENA_LEAD_ID}`,
    cta: "Open Elena Ruiz lead",
  },
  {
    title: "3. Click every record on that path",
    body: "Lead → Deal (Ruiz · Melbourne HO3) → Contact → Policy HO3-ELENA-2026. Issued policy files are dec + ID, not shopping docs. Activity timeline on Contact, Policy, and Ruiz Tile LLC: task + meeting + logged call (no softphone) each have a log with FKs.",
    href: `/deals/${ELENA_DEAL_ID}`,
    cta: "Open Melbourne HO3 deal",
  },
  {
    title: "4. Ana stays the HO3-only shop",
    body: "Home → Open Ana Dib HO3 shop. Cov A $321,000. Eight markets, zero bindable. Do not bind Ana. No policy from those quotes. Filter-first matching is unchanged.",
    href: `/deals/${DEAL_ID}`,
    cta: "Open Ana Dib shop",
  },
  {
    title: "5. Drop a dec packet (match, never duplicate)",
    body: "Leads → Drop a dec packet. The Melbourne sample matches Elena (name + phone/email). You stay on her lead. A new name creates a new lead.",
    href: "/leads",
    cta: "Go to Leads",
  },
  {
    title: "6. Run-it-yourself: stub lead → deal → bind",
    body: "Stub email or social lead → Convert to deal → upload a source dec → Fill Quote Sheet blanks → build stub quotes for green markets → Finalize quote results (cheapest first) → attach a quote PDF → Bind. That is the only step that creates a Contact/Business and a Policy (status Bound).",
    href: "/leads",
    cta: "Start from Leads",
  },
];

export default function GetStartedPage() {
  return (
    <AppShell title="Get Started">
      <div className="mb-4 ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">Run this path</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          FitFirst is Javy&apos;s desk: every module talks. A quote never becomes a policy.
          Bind is Closed Won. Seeded click-through: Elena Ruiz (bound HO3) plus Ana Dib
          (shop only, Cov A $321,000).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/contacts/${ELENA_CONTACT_ID}`} className={cn(buttonVariants({ size: "sm" }))}>
            Elena contact
          </Link>
          <Link
            href={`/policies/${ELENA_POLICY_ID}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Elena HO3 policy
          </Link>
          <Link
            href={`/accounts/${ELENA_ACCOUNT_ID}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Ruiz Tile LLC
          </Link>
        </div>
      </div>
      <ol className="space-y-3">
        {STEPS.map((step) => (
          <li key={step.title} className="ff-card p-4">
            <h3 className="text-sm font-semibold text-navy">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            <Link href={step.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3")}>
              {step.cta}
            </Link>
          </li>
        ))}
      </ol>
    </AppShell>
  );
}
