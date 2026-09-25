import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import type { SettingsNavId } from "@/lib/settings/nav";

export function DeveloperComingSoon({
  title,
  current,
}: {
  title: string;
  current: SettingsNavId;
  sibling?: string;
}) {
  return (
    <SettingsShell title={title} current={current}>
      <div className="ff-card max-w-2xl space-y-3 p-4">

        <p className="text-sm">
          <Link href="/settings/developer" className="font-medium text-[#002868] hover:underline">
            Developer Hub
          </Link>
        </p>
      </div>
    </SettingsShell>
  );
}
