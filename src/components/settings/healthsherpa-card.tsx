import Link from "next/link";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import type { CatalogItem } from "@/lib/integrations/catalog-store";
import {
  HEALTHSHERPA_ACA_BLURB,
  HEALTHSHERPA_ACA_DOCS_URL,
  HEALTHSHERPA_DOCS_URL,
  HEALTHSHERPA_EXTERNAL_ID_STAMP,
  HEALTHSHERPA_INBOUND_BLURB,
  HEALTHSHERPA_MEDICARE_BLURB,
  HEALTHSHERPA_NO_FF_FEE,
  HEALTHSHERPA_REVIEW_PATH,
  HEALTHSHERPA_WEBHOOK_PATH,
} from "@/lib/healthsherpa/copy";
import type { VaultPublicStatus } from "@/lib/developer/vault-public";
import type { MedicareBulkOneshotState } from "@/lib/healthsherpa/bulk-medicare";
import { MedicareBulkSyncPanel } from "@/components/settings/medicare-bulk-sync-panel";

export function HealthSherpaCard({
  item,
  medicare,
  aca,
  inbound,
  medicareBulkReady,
  medicareBulkOneshot,
}: {
  item: CatalogItem;
  medicare: VaultPublicStatus;
  aca: VaultPublicStatus;
  inbound: VaultPublicStatus;
  medicareBulkReady?: {
    hasApiKey: boolean;
    hasAgentEmail: boolean;
    configured: boolean;
    code: "ok" | "not_configured" | "agent_email";
    message: string | null;
  };
  medicareBulkOneshot?: MedicareBulkOneshotState;
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

          </div>
        </div>
        <ConnectionBadge connected={ready} label={ready ? "Configured" : "Not configured"} />
      </div>

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
      {!isMedicare ? null : null}
      {isMedicare && medicareBulkReady && medicareBulkOneshot ? (
        <div className="mt-3">
          <MedicareBulkSyncPanel ready={medicareBulkReady} oneshot={medicareBulkOneshot} compact />
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <Link href="/settings/developer-hub/api-vault" className="font-medium text-primary hover:underline">
          API vault
        </Link>
        <Link href={HEALTHSHERPA_REVIEW_PATH} className="text-muted-foreground hover:underline">
          Inbound review
        </Link>
        <a href={docs} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">
          HealthSherpa docs
        </a>
      </div>
    </article>
  );
}
