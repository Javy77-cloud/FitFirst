import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Tasks are dissolved. The list is the collapsed commitments timeline on Notifications. */
export default async function TasksRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const newTask = (typeof params.newTask === "string" ? params.newTask : "") === "1";
  redirect(newTask ? "/notifications?newCommitment=1#commitments" : "/notifications#commitments");
}
