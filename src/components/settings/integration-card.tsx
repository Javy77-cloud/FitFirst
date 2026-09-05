import { Lock } from "lucide-react";
import { connectCatalogStub, disconnectCatalogStub } from "@/app/actions/integrations";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AGENCY_PAYS_VENDOR, type IntegrationTone } from "@/lib/integrations/catalog";
import type { CatalogItem } from "@/lib/integrations/catalog-store";
import { cn } from "@/lib/utils";

export type IntegrationReturnTo = "/settings/integrations" | "/settings/social";

const TONE_CLASS: Record<IntegrationTone, string> = {
  google: "bg-[#e8f0fe] text-[#1967d2]",
  outlook: "bg-[#e6f2fb] text-[#0b5cab]",
  zoho: "bg-[#fde8e8] text-[#c81e1e]",
  yahoo: "bg-[#f3e8fd] text-[#6d28d9]",
  facebook: "bg-[#e7f0ff] text-[#1877f2]",
  instagram: "bg-[#fde8f0] text-[#c13584]",
  x: "bg-secondary text-navy",
  linkedin: "bg-[#e8f4fb] text-[#0a66c2]",
  gbp: "bg-[#e6f4ea] text-[#188038]",
  sms: "bg-[#eef6ff] text-[#1d4e89]",
  esign: "bg-[#f4eefc] text-[#6b21a8]",
  rater: "bg-[#fff4e5] text-[#b45309]",
  campaign: "bg-[#eef2ff] text-[#3730a3]",
  video: "bg-[#e0f2fe] text-[#0369a1]",
};

export function IntegrationCard({
  item,
  canEdit,
  returnTo = "/settings/integrations",
  gbpLocked = false,
  gbpLockReason,
}: {
  item: CatalogItem;
  canEdit: boolean;
  returnTo?: IntegrationReturnTo;
  gbpLocked?: boolean;
  gbpLockReason?: string | null;
}) {
  const locked = Boolean(item.adminGated && !canEdit) || gbpLocked;
  const showToggle = canEdit && !gbpLocked;

  return (
    <Card
      size="sm"
      className="h-full"
      data-provider={item.id}
      data-connected={item.connected ? "true" : "false"}
      data-admin-gated={item.adminGated ? "true" : "false"}
      data-locked={locked ? "true" : "false"}
    >
      <CardHeader className="border-b">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
              TONE_CLASS[item.tone],
            )}
          >
            {item.initials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <CardTitle className="text-navy">{item.name}</CardTitle>
              {item.optional ? (
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-caption font-semibold uppercase text-muted-foreground">
                  Optional
                </span>
              ) : null}
              {item.adminGated ? (
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-caption font-semibold uppercase text-muted-foreground">
                  Admin
                </span>
              ) : null}
            </div>
            <CardDescription className="mt-0.5">{item.blurb}</CardDescription>
          </div>
        </div>
        <CardAction>
          {gbpLocked ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              <Lock className="size-3" />
              Locked
            </span>
          ) : (
            <ConnectionBadge connected={item.connected} />
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <p className="text-helper text-muted-foreground">{AGENCY_PAYS_VENDOR}</p>
        <p className="text-helper text-muted-foreground">{item.byoNote}</p>
        {item.connected && item.accountLabel && !gbpLocked ? (
          <p className="text-xs text-navy">
            {item.accountLabel}
            {item.lastConnectStatus ? ` · ${item.lastConnectStatus}` : ""}
          </p>
        ) : null}
        {gbpLocked && gbpLockReason ? (
          <p className="text-helper text-muted-foreground">{gbpLockReason}</p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-between gap-2">
        {showToggle ? (
          <form action={item.connected ? disconnectCatalogStub : connectCatalogStub}>
            <input type="hidden" name="provider" value={item.id} />
            <input type="hidden" name="next" value={returnTo} />
            <button
              type="submit"
              role="switch"
              aria-checked={item.connected}
              aria-label={`${item.connected ? "Disconnect" : "Connect"} ${item.name}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-1 py-1 pr-2.5 text-sm font-medium",
                item.connected
                  ? "border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] text-[var(--ff-green)]"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  item.connected ? "bg-[var(--ff-green)]" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                    item.connected ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </span>
              {item.connected ? "Disconnect" : "Connect"}
            </button>
          </form>
        ) : (
          <p className="text-helper text-muted-foreground">
            {gbpLocked
              ? "Admin unlocks GBP monitoring."
              : "Admin connects this. Agency pays the vendor."}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
