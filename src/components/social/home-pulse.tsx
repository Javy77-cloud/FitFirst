import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SocialPulseSnapshot } from "@/lib/social/pulse";
import { PulseCards } from "./pulse-cards";

export function HomeSocialPulse({ pulse }: { pulse: SocialPulseSnapshot }) {
  return (
    <section className="ff-card p-4" data-widget="social-pulse">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy">Social pulse</h3>
          <p className="text-[11px] text-muted-foreground">
            {pulse.connectedVisible === 0
              ? "No connected stubs in view. Agency connects the accounts."
              : `${pulse.connectedVisible} connected stub${pulse.connectedVisible === 1 ? "" : "s"} · demo numbers`}
            {pulse.gbpLocked ? " · GBP locked until Admin allows monitoring" : ""}
          </p>
        </div>
        <Link
          href="/social"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
        >
          Open pulse
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <PulseCards cards={pulse.cards} compact />
    </section>
  );
}
