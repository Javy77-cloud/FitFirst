import { ActivityRecordPage } from "@/components/record-context/activity-record-page";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ActivityRecordPage id={id} expectKind="meeting" />;
}
