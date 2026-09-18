import { AppShell } from "@/components/app-shell";
import { HealthSherpaReviewQueue } from "@/components/healthsherpa/review-queue";
import { requireSignedIn } from "@/lib/auth/guards";
import {
  listHealthSherpaReviewContacts,
  listHealthSherpaReviewEnrollments,
} from "@/lib/healthsherpa/review";

export const dynamic = "force-dynamic";

export default async function HealthSherpaReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSignedIn();
  const params = await searchParams;
  const focus = typeof params.enrollment === "string" ? params.enrollment : null;
  const [rows, contacts] = await Promise.all([
    listHealthSherpaReviewEnrollments(),
    listHealthSherpaReviewContacts(),
  ]);

  return (
    <AppShell title="HealthSherpa review" eyebrow="Contacts">
      <HealthSherpaReviewQueue rows={rows} contacts={contacts} focusId={focus} />
    </AppShell>
  );
}
