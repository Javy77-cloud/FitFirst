import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Demo checklist removed. Bookmarks land on the live desk. */
export default function GetStartedPage() {
  redirect("/");
}
