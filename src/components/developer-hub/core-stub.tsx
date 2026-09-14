import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import type { SettingsNavId } from "@/lib/settings/nav";

export function DeveloperHubCoreStub({
  title,
  current,
  body,
}: {
  title: string;
  current: SettingsNavId;
  body: string;
}) {
  return (
    <SettingsShell title={title} current={current}>
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">{body}</p>
      <p className="text-sm">
        <Link href="/settings/developer-hub" className="font-medium text-[#002868] hover:underline">
          Developer Hub
        </Link>
      </p>
    </SettingsShell>
  );
}
