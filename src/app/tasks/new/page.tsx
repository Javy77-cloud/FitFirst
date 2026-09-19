import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function NewTaskPage() {
  redirect("/notifications?newCommitment=1#commitments");
}
