import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  DEAL_ID,
  ELENA_ACCOUNT_ID,
  ELENA_CONTACT_ID,
  ELENA_DEAL_ID,
  ELENA_LEAD_ID,
  ELENA_POLICY_ID,
  HARBOR_ACCOUNT_ID,
  HARBOR_DEAL_ID,
} from "@/lib/fixtures/ids";
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
    title: "4. Super-Copy / Fill / Forms share the sheet",
    body: "On the Elena Quote Sheet: Super-Copy JSON, Send to Fill, and Forms Fill all read the same quote_sheets row. Yellow missing / blue CHECK. Then search Elena and open Account 360 counts.",
    href: `/deals/${ELENA_DEAL_ID}?tab=quote-sheet`,
    cta: "Open Elena Quote Sheet",
  },
  {
    title: "5. Commercial Closed Won",
    body: "Harbor Key Marine LLC — EIN, employees, sales, W-2/1099 payroll. One GL policy after bind, linked to the Business. Account 360 shows lifetime 1 / active 1 and the Harbor Key task on both the business and the policy.",
    href: `/accounts/${HARBOR_ACCOUNT_ID}`,
    cta: "Open Harbor Key 360",
  },
  {
    title: "6. Pipeline switcher is real links",
    body: "P&C pipeline, Health, Life, Flood, then Won-Lost and Archive as two tabs. Flood is a normal board — no Admin badge. Ana sits on Quote Sent and stays unbound. Closed Won already wrote Elena and Harbor policies. Archive later must not cancel emails hung on won date.",
    href: "/pipeline?pipeline=p-c",
    cta: "Open P&C pipeline",
  },
  {
    title: "7. Ana stays the HO3-only shop",
    body: "Home → Open Ana Dib HO3 shop. Cov A $321,000. Eight markets, zero bindable. Do not bind Ana. No policy from those quotes. Filter-first matching is unchanged.",
    href: `/deals/${DEAL_ID}`,
    cta: "Open Ana Dib shop",
  },
  {
    title: "8. Drop a dec, wind mit, or 4-point on the deal",
    body: "Deals → drop a source packet. The Melbourne sample matches Elena (name + phone/email) and stays on her deal. A new name opens a new shop. Leads hold the person only — no package drop there.",
    href: "/deals",
    cta: "Go to Deals",
  },
  {
    title: "9. Run-it-yourself: stub lead → deal → bind",
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
          <Link
            href={`/deals/${ELENA_DEAL_ID}?tab=quote-sheet`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Quote Sheet
          </Link>
          <Link
            href={`/deals/${ELENA_DEAL_ID}?tab=quotes`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Ranked quotes
          </Link>
          <Link
            href={`/accounts/${HARBOR_ACCOUNT_ID}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Harbor Key Marine
          </Link>
          <Link
            href={`/deals/${HARBOR_DEAL_ID}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Harbor Key deal
          </Link>
          <Link href="/search?q=Elena" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Search Elena
          </Link>
          <Link href="/pipeline?pipeline=p-c" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            P&C pipeline
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
