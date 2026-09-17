import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { MissingQuestionsPanel } from "@/components/developer/missing-questions-panel";
import { requireAdminOrDeveloperPage } from "@/lib/auth/guards";
import { listMissingQuestions } from "@/lib/carrier-gaps/store";
import { MISSING_QUESTIONS_PATH } from "@/lib/carrier-gaps/types";

export const dynamic = "force-dynamic";

export default async function DeveloperMissingQuestionsPage() {
  await requireAdminOrDeveloperPage();
  const rows = await listMissingQuestions("all");

  return (
    <AppShell title="Missing questions" eyebrow="Developer">
      <DeskPageTrail
        fallbackHref="/developer"
        crumbs={[
          { href: "/developer", label: "Developer" },
          { label: "Missing questions" },
        ]}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Standing practice: when a quote bot or carrier asks for data FitFirst has no field for, log
        it once here. Suggested surface is Deal Details or Risk Profile. Mark{" "}
        <span className="font-medium text-navy">Added</span> after the field ships.{" "}
        <Link href="/developer" className="text-primary hover:underline">
          Developer hub
        </Link>
        .
      </p>
      <MissingQuestionsPanel rows={rows} returnTo={MISSING_QUESTIONS_PATH} />
    </AppShell>
  );
}
