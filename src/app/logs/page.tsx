import { redirect } from "next/navigation";
import { requireSiteDeveloperPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/** Legacy /logs Appetite Log — site developers land on the training datasheet. */
export default async function LogsPage() {
  await requireSiteDeveloperPage();
  redirect("/settings/developer/appetite-log");
}
