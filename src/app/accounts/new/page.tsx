import { redirect } from "next/navigation";

/** Thin fallback — primary UX is the Add Business popup on the list. */
export default function NewBusinessPage() {
  redirect("/accounts?new=1");
}
