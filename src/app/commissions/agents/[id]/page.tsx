import { notFound, redirect } from "next/navigation";
import { requireSignedIn } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AgentCommissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSignedIn();
  const { id } = await params;
  if (!id) notFound();
  if (!session.isAdmin && session.userId !== id) notFound();
  redirect("/commissions");
}
