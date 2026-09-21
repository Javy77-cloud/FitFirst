import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { AutoQuestionGapsPanel } from "@/components/developer/auto-question-gaps-panel";
import { requireDeveloperPage } from "@/lib/auth/guards";
import {
  AUTO_QUESTION_GAPS_DOC_PATH,
  readAutoQuestionGapList,
} from "@/lib/quote-bot/auto-question-gaps";

export const dynamic = "force-dynamic";

export default async function DeveloperAutoQuestionGapsPage() {
  await requireDeveloperPage();
  const list = readAutoQuestionGapList();

  return (
    <AppShell title="Auto question gaps" eyebrow="Developer">
      <DeskPageTrail
        fallbackHref="/developer"
        crumbs={[
          { href: "/developer", label: "Developer" },
          { label: "Auto question gaps" },
        ]}
      />
      <AutoQuestionGapsPanel list={list} />
      <p className="mt-4 text-xs text-muted-foreground">{AUTO_QUESTION_GAPS_DOC_PATH}</p>
    </AppShell>
  );
}
