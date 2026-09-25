import Link from "next/link";
import { SettingsGroupIcon } from "@/components/settings/settings-group-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SETTINGS_HOME_NAV } from "@/lib/settings/nav";

export function SettingsHomeCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {SETTINGS_HOME_NAV.map((group) => {
        const primary = group.children.filter((child) => !child.advanced);
        const advanced = group.children.filter((child) => child.advanced);
        return (
          <Card
            key={group.id}
            id={group.id}
            size="sm"
            className="overflow-hidden bg-card ring-1 ring-navy/10"
            data-ff-settings-umbrella={group.id}
          >
            <div className="h-1 bg-navy" />
            <CardHeader className="border-b border-navy/10 bg-[color-mix(in_srgb,var(--ff-navy)_6%,white)]">
              <div className="flex items-start gap-3">
                <SettingsGroupIcon name={group.icon} tone={group.badge === "Admin" ? "navy" : "terracotta"} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-navy">
                      <Link href={group.href} className="hover:underline">
                        {group.label}
                      </Link>
                    </CardTitle>
                    {group.badge ? (
                      <span className="rounded-sm bg-navy px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                        {group.badge}
                      </span>
                    ) : null}
                  </div>
                  <CardDescription className="text-navy/70">{group.blurb}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <ul className="space-y-1">
                {primary.map((child) => (
                  <li key={`${group.id}-${child.id}-${child.href}`}>
                    <Link
                      href={child.href}
                      className="flex items-baseline justify-between gap-2 rounded-md px-1.5 py-1 text-sm text-navy hover:bg-navy/5"
                    >
                      <span>{child.label}</span>

                    </Link>
                  </li>
                ))}
              </ul>
              {advanced.length ? (
                <div className="mt-3 border-t border-dashed border-navy/15 pt-2">
                  <p className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--ff-terracotta)]">
                    Advanced / Admin
                  </p>
                  <ul className="mt-1 space-y-1">
                    {advanced.map((child) => (
                      <li key={`${group.id}-${child.id}-${child.href}`}>
                        <Link
                          href={child.href}
                          className="flex items-baseline justify-between gap-2 rounded-md px-1.5 py-1 text-sm text-navy/80 hover:bg-navy/5"
                        >
                          <span>{child.label}</span>

                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
