import { ConnectionBadge } from "@/components/settings/connection-badge";
import { AGENCY_PAYS_VENDOR } from "@/lib/integrations/catalog";
import type { CatalogItem } from "@/lib/integrations/catalog-store";

export function IntegrationCard({
  item,
}: {
  item: CatalogItem;
  canEdit?: boolean;
  returnTo?: "/settings/integrations" | "/settings/social";
}) {
  return (
    <article
      className="flex flex-col rounded-md border border-border bg-card p-3"
      data-provider={item.id}
      data-connected="false"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden
            className="mt-0.5 flex size-8 shrink-0 items-center rounded-md bg-secondary text-[11px] font-semibold text-navy"
          >
            {item.initials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold text-navy">{item.name}</h3>
              {item.optional ? (
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-caption font-semibold uppercase text-muted-foreground">
                  Optional
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-helper text-muted-foreground">{item.blurb}</p>
          </div>
        </div>
        <ConnectionBadge connected={false} />
      </div>
      <p className="mt-2 text-helper text-muted-foreground">{AGENCY_PAYS_VENDOR}</p>
      <p className="text-helper text-muted-foreground">{item.byoNote}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        Connect {item.name} when the agency is ready. OAuth is not wired on this desk.
      </p>
    </article>
  );
}
