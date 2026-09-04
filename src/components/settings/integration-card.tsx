import { connectCatalogStub, disconnectCatalogStub } from "@/app/actions/integrations";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { Button } from "@/components/ui/button";
import type { CatalogItem } from "@/lib/integrations/catalog-store";

export function IntegrationCard({
  item,
  canEdit,
}: {
  item: CatalogItem;
  canEdit: boolean;
}) {
  return (
    <article
      className="flex flex-col rounded-md border border-border bg-card p-3"
      data-provider={item.id}
      data-connected={item.connected ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] font-semibold text-navy"
          >
            {item.initials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold text-navy">{item.name}</h3>
              {item.optional ? (
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  Optional
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.blurb}</p>
          </div>
        </div>
        <ConnectionBadge connected={item.connected} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{item.byoNote}</p>
      {item.connected && item.accountLabel ? (
        <p className="mt-1 text-xs text-navy">
          {item.accountLabel}
          {item.lastConnectStatus ? ` · ${item.lastConnectStatus}` : ""}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canEdit ? (
          item.connected ? (
            <form action={disconnectCatalogStub}>
              <input type="hidden" name="provider" value={item.id} />
              <Button type="submit" size="sm" variant="outline">
                Disconnect
              </Button>
            </form>
          ) : (
            <form action={connectCatalogStub}>
              <input type="hidden" name="provider" value={item.id} />
              <Button type="submit" size="sm">
                Connect stub
              </Button>
            </form>
          )
        ) : (
          <p className="text-xs text-muted-foreground">Admin connects this. Agency pays the vendor.</p>
        )}
      </div>
    </article>
  );
}
