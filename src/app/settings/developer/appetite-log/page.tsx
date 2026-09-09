import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireSiteDeveloperPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/** Platform-builder training data only — redirects to the gated Appetite Log table. */
export default async function DeveloperAppetiteLogPage() {
  await requireSiteDeveloperPage();
  redirect("/carriers/logs");
}
