import { redirect } from "next/navigation";

export default function TaskDetailRedirect() {
  redirect("/tasks");
}
