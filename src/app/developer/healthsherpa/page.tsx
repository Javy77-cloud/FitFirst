import { AppShell } from "@/components/app-shell";
import { DeskPageTrail } from "@/components/desk/desk-page-trail";
import { HealthSherpaReviewQueue } from "@/components/healthsherpa/review-queue";
import { requireDeveloperPage } from "@/lib/auth/guards";
import {
  listHealthSherpaReviewContacts,
  listHealthSherpaReviewEnrollments,
} from "@/lib/healthsherpa/review";

export const dynamic = "force-dynamic";

export default async function DeveloperHealthSherpaPage() {
  await requireDeveloperPage();
  const [rows, contacts] = await Promise.all([
    listHealthSherpaReviewEnrollments(),
    listHealthSherpaReviewContacts(),
  ]);

  return (
    <AppShell title="HealthSherpa" eyebrow="Developer">
      <DeskPageTrail
        fallbackHref="/developer"
        crumbs={[
          { href: "/developer", label: "Developer" },
          { label: "HealthSherpa" },
        ]}
      />
      <HealthSherpaReviewQueue rows={rows} contacts={contacts} />
    </AppShell>
  );
}
