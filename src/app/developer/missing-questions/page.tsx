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

      <MissingQuestionsPanel rows={rows} returnTo={MISSING_QUESTIONS_PATH} />
    </AppShell>
  );
}
