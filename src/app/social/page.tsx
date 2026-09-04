import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { InquiryList } from "@/components/social/inquiry-list";
import { PulseCards } from "@/components/social/pulse-cards";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { loadSocialPulse } from "@/lib/social/store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SocialPulsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const role = session.isAdmin ? "admin" : "agent";
  const [pulse, query] = await Promise.all([loadSocialPulse(role), searchParams]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;

  return (
    <AppShell
      title="Social pulse"
      actions={
        <Link href="/settings/social" className={cn(buttonVariants({ variant: "outline" }))}>
          {session.isAdmin ? "Connect accounts" : "View connections"}
        </Link>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Followers, engagement, and views for connected stubs. FitFirst builds the plug; the agency
        connects Facebook, Instagram, X, LinkedIn, and Google Business Profile. No live OAuth. No
        vendor spend. Inbound asks become Leads.
      </p>
      {notice === "gbp-locked" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Google Business Profile stays locked until Admin allows agents to monitor it.
        </p>
      ) : null}
      {notice === "platform-disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          That platform is not connected. Ask Admin to click Connect stub.
        </p>
      ) : null}
      {notice === "no-new-inquiries" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Visible inquiries already have Lead records (matched by name plus email or phone).
        </p>
      ) : null}
      {pulse.gbpLocked ? (
        <p className="mb-3 rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm">
          GBP is locked on this desk. Admin must toggle “Allow agents to monitor GBP” in Settings →
          Social after connecting the listing.
        </p>
      ) : null}

      <PulseCards cards={pulse.cards} />
      <div className="mt-4">
        <InquiryList inquiries={pulse.inquiries} />
      </div>
    </AppShell>
  );
}
