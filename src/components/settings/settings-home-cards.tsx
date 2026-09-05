import Link from "next/link";
import { SettingsGroupIcon } from "@/components/settings/settings-group-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SETTINGS_NAV } from "@/lib/settings/nav";

export function SettingsHomeCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {SETTINGS_NAV.map((group) => (
        <Card key={group.id} id={group.id} size="sm" className="bg-card ring-border">
          <CardHeader className="border-b">
            <div className="flex items-start gap-3">
              <SettingsGroupIcon name={group.icon} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-navy">
                    <Link href={group.href} className="hover:underline">
                      {group.label}
                    </Link>
                  </CardTitle>
                  {group.badge ? (
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {group.badge}
                    </span>
                  ) : null}
                </div>
                <CardDescription>{group.blurb}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="space-y-1">
              {group.children.map((child) => (
                <li key={`${group.id}-${child.id}-${child.href}`}>
                  <Link
                    href={child.href}
                    className="flex items-baseline justify-between gap-2 rounded-md px-1.5 py-1 text-sm text-navy hover:bg-secondary/70"
                  >
                    <span>{child.label}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{child.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
