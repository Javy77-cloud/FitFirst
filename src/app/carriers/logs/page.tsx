import { redirect } from "next/navigation";
import { requireSiteDeveloperPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/** Legacy Appetite Log URL — site developers land on the training datasheet. */
export default async function CarrierLogsPage() {
  await requireSiteDeveloperPage();
  redirect("/settings/developer/appetite-log");
}
