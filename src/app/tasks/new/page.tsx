import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Deep links / legacy /tasks/new open the list dialog instead of a blank page. */
export default function NewTaskPage() {
  redirect("/tasks?newTask=1");
}
