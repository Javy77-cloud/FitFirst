import Link from "next/link";
import { MissingQuestionsPanel } from "@/components/developer/missing-questions-panel";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminOrDeveloperPage } from "@/lib/auth/guards";
import { listMissingQuestions } from "@/lib/carrier-gaps/store";
import { MISSING_QUESTIONS_SETTINGS_PATH } from "@/lib/carrier-gaps/types";

export const dynamic = "force-dynamic";

export default async function SettingsMissingQuestionsPage() {
  await requireAdminOrDeveloperPage();
  const rows = await listMissingQuestions("all");

  return (
    <SettingsShell title="Missing questions" current="missing-questions">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Admin / Developer gap list. Same rows as{" "}
        <Link href="/developer/missing-questions" className="text-primary hover:underline">
          Developer → Missing questions
        </Link>
        . Log a carrier or quote-bot ask once, then mark Added when the field ships on Deal Details
        or Risk Profile.
      </p>
      <MissingQuestionsPanel rows={rows} returnTo={MISSING_QUESTIONS_SETTINGS_PATH} />
    </SettingsShell>
  );
}
