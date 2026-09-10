import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireSiteDeveloperPage } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Beginnings-only stub — columns exist; rows fill as future gl quotes land. */
export default async function DeveloperGlLearningPage() {
  await requireSiteDeveloperPage();
  return (
    <SettingsShell
      title="GL Learning"
      current="developer"
      actions={
        <Link href="/settings/developer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Developer Hub
        </Link>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground" data-ff-gl-learning-intro="">
        GL learning stub: industry/class, revenue, employees, location. Same site-dev gate as Appetite Log. Stub UI — no rows yet.
      </p>
      <section className="ff-card px-4 py-8" data-ff-gl-learning-sheet="">
        <p className="text-sm text-muted-foreground">
          No GL learning rows yet. Quote writes for this line will attach a feature snapshot on 
          <code className="text-xs">quote_attempt_logs</code> going forward.
        </p>
      </section>
    </SettingsShell>
  );
}
