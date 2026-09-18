import Link from "next/link";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import type { CatalogItem } from "@/lib/integrations/catalog-store";
import {
  HEALTHSHERPA_ACA_BLURB,
  HEALTHSHERPA_ACA_DOCS_URL,
  HEALTHSHERPA_DOCS_URL,
  HEALTHSHERPA_INBOUND_BLURB,
  HEALTHSHERPA_MEDICARE_BLURB,
  HEALTHSHERPA_NO_FF_FEE,
  HEALTHSHERPA_WEBHOOK_PATH,
} from "@/lib/healthsherpa/copy";
import type { VaultPublicStatus } from "@/lib/developer/vault-public";

export function HealthSherpaCard({
  item,
  medicare,
  aca,
  inbound,
}: {
  item: CatalogItem;
  medicare: VaultPublicStatus;
  aca: VaultPublicStatus;
  inbound: VaultPublicStatus;
}) {
  const isMedicare = item.id === "healthsherpa_medicare";
  const ready = isMedicare ? medicare.configured : aca.configured;
  const blurb = isMedicare ? HEALTHSHERPA_MEDICARE_BLURB : HEALTHSHERPA_ACA_BLURB;
  const docs = isMedicare ? HEALTHSHERPA_DOCS_URL : HEALTHSHERPA_ACA_DOCS_URL;

  return (
    <article
      className="flex flex-col rounded-md border border-border bg-card p-3"
      data-provider={item.id}
      data-connected={ready ? "true" : "false"}
      data-ff-healthsherpa-card={item.id}
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
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-caption font-semibold uppercase text-muted-foreground">
                  Optional
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-helper text-muted-foreground">{item.blurb}</p>
          </div>
        </div>
        <ConnectionBadge connected={ready} label={ready ? "Configured" : "Not configured"} />
      </div>
      <p className="mt-2 text-helper text-muted-foreground">{HEALTHSHERPA_NO_FF_FEE}</p>
      <p className="text-helper text-muted-foreground">{blurb}</p>
      <p className="mt-2 text-helper text-muted-foreground" data-ff-healthsherpa-webhook="">
        {HEALTHSHERPA_INBOUND_BLURB} Destination{" "}
        <code className="text-[11px]">{HEALTHSHERPA_WEBHOOK_PATH}</code>
        {inbound.unreadable
          ? " · inbound vault unreadable — re-save the webhook secret"
          : inbound.configured
            ? inbound.source === "env"
              ? " · inbound secret from server env"
              : " · inbound secret stored in vault"
            : " · inbound secret not configured"}
        .
      </p>
      {!isMedicare ? (
        <p className="text-helper text-muted-foreground">
          {aca.configured
            ? "Marketplace partner key is stored. Sync opens HealthSherpa Marketplace; QuoteConnect runs when ZIP and date of birth are on the deal."
            : "Needs partner credentials. Medicare path works without this card. Same inbound webhook either way."}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <Link href="/settings/developer-hub/api-vault" className="font-medium text-primary hover:underline">
          API vault
        </Link>
        <a href={docs} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">
          HealthSherpa docs
        </a>
      </div>
    </article>
  );
}
