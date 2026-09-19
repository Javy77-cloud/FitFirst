import Link from "next/link";
import { SETTINGS_PINNED_LINKS, settingsChildFor, type SettingsNavId } from "@/lib/settings/nav";
import { cn } from "@/lib/utils";

export function SettingsPinnedLinks({
  current,
  compact = false,
}: {
  current?: SettingsNavId;
  compact?: boolean;
}) {
  const activeChild = current ? settingsChildFor(current) : null;

  return (
    <nav
      aria-label="Find Lines of business and Email templates"
      className={cn(
        compact ? "border-b border-border px-3 py-2" : "mb-4 rounded-lg border border-primary/30 bg-card px-3 py-3",
      )}
      data-ff-settings-pinned=""
    >
      <p
        className={cn(
          "font-semibold uppercase tracking-wide text-muted-foreground",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        Find
      </p>
      <ul className={cn("mt-1.5", compact ? "space-y-0.5" : "flex flex-wrap gap-2")}>
        {SETTINGS_PINNED_LINKS.map((item) => {
          const active = activeChild === item.id || current === item.id;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  compact
                    ? "block rounded-md px-2 py-1 text-sm"
                    : "inline-flex rounded-md border px-3 py-1.5 text-sm font-semibold",
                  active
                    ? compact
                      ? "bg-primary text-primary-foreground"
                      : "border-primary bg-primary text-primary-foreground"
                    : compact
                      ? "text-navy hover:bg-card"
                      : "border-border bg-secondary/70 text-navy hover:border-primary/40",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
