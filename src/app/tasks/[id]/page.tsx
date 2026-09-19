import { redirect } from "next/navigation";
import { resolveTaskRedirect } from "@/lib/notifications/load-commitments";

export const dynamic = "force-dynamic";

export default async function TaskDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(await resolveTaskRedirect(id));
}
