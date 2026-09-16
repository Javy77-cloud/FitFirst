import Link from "next/link";
import { DealPackageLinesForm } from "@/components/deal/deal-package-lines-form";
import {
  dealProductDef,
  dealProductSwitcherHref,
  type DealProductId,
} from "@/lib/deals/deal-products";
import {
  productChipBound,
  productChipLabel,
  productChipStageLabel,
  productReadyFromQuotes,
} from "@/lib/deals/product-stages";
import { themeForProduct } from "@/lib/deals/product-ui";
import { cn } from "@/lib/utils";

export type DealProductChipProgress = {
  filled?: number;
  total?: number;
  pct?: number;
  complete?: boolean;
};

export type DealProductQuoteGap = {
  complete: boolean;
  shopped?: boolean;
  summary: string;
};

export type DealProductStageChip = {
  stage?: string | null;
  lostReason?: string | null;
};

export function DealLineSwitcher({
  dealId,
  products,
  active,
  tab,
  complete = {},
  progress = {},
  quoteGaps = {},
  stages = {},
  formLabels = {},
}: {
  dealId: string;
  products: readonly DealProductId[];
  active: DealProductId;
  tab?: string | null;
  complete?: Partial<Record<DealProductId, boolean>>;
  progress?: Partial<Record<DealProductId, DealProductChipProgress>>;
  quoteGaps?: Partial<Record<DealProductId, DealProductQuoteGap>>;
  stages?: Partial<Record<DealProductId, DealProductStageChip>>;
  formLabels?: Partial<Record<DealProductId, string>>;
}) {
  if (!products.length) return null;
  const doneCount = products.filter((id) => productChipBound(stages[id]?.stage)).length;
  return (
    <div className="mt-1.5 space-y-1" data-ff-deal-product-chip-row="">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Products
          <span className="ml-1.5 font-medium normal-case tracking-normal" data-ff-product-ready-count="">
            {`${doneCount}/${products.length} ready`}
          </span>
        </p>
        <DealPackageLinesForm dealId={dealId} selected={products} tab={tab} />
      </div>
      <nav
        aria-label="Deal products"
        className="flex flex-wrap items-stretch gap-1"
        data-ff-deal-line-switcher=""
        data-ff-deal-product-chips=""
      >
        {products.map((product) => {
          const selected = product === active;
          const stat = progress[product];
          const gap = quoteGaps[product];
          const quotesMissing = Boolean(gap && !gap.complete);
          const quotesIn = productReadyFromQuotes({
            complete: gap?.complete ?? complete[product],
          });
          const stage = stages[product]?.stage;
          const bound = productChipBound(stage);
          const done = bound;
          const pct = quotesMissing ? 0 : bound ? 100 : quotesIn ? 70 : (stat?.pct ?? 0);
          const theme = themeForProduct(product);
          const def = dealProductDef(product);
          const label = productChipLabel({ product, quotingForm: formLabels[product] });
          const stageLabel = productChipStageLabel(stage);
          return (
            <Link
              key={product}
              href={dealProductSwitcherHref({ dealId, product, tab })}
              scroll={false}
              className={cn(
                "relative min-w-[4.5rem] overflow-hidden rounded border px-2 py-1 text-[11px] font-semibold transition-colors",
                selected
                  ? cn(theme.chipOn, "shadow-sm ring-2 ring-navy/25")
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/40",
                quotesMissing && !selected && "border-fit-flag/50",
              )}
              data-ff-deal-line-chip={def.shopLine}
              data-ff-deal-product-chip={product}
              data-ff-product-complete={done ? "1" : "0"}
              data-ff-product-quotes-complete={gap ? (gap.complete ? "1" : "0") : undefined}
              data-ff-product-missing-quotes={quotesMissing ? "1" : "0"}
              data-ff-product-stage={stage ?? ""}
              title={quotesMissing ? gap?.summary : undefined}
              data-active={selected ? "true" : "false"}
              aria-current={selected ? "page" : undefined}
            >
              <span className="flex items-center gap-1">
                {quotesMissing ? (
                  <span
                    className="inline-flex size-2.5 items-center justify-center rounded-full bg-fit-flag text-[8px] text-white"
                    aria-label="Incomplete quotes"
                    data-ff-product-missing-quotes-chip=""
                    title={gap?.summary ?? "Missing quotes"}
                  >
                    !
                  </span>
                ) : done ? (
                  <span
                    className="inline-flex size-2.5 items-center justify-center rounded-full bg-[var(--ff-green)] text-[8px] text-white"
                    aria-label="Bound"
                  >
                    ✓
                  </span>
                ) : (
                  <span className={cn("inline-block size-1 rounded-full", theme.bar)} aria-hidden />
                )}
                {label}
                {stageLabel ? (
                  <span
                    className={cn(
                      "text-[9px] font-medium",
                      selected ? "text-white/85" : "text-muted-foreground",
                    )}
                    data-ff-product-stage-label=""
                  >
                    {stageLabel}
                  </span>
                ) : null}
              </span>
              <span
                className={cn("absolute inset-x-0 bottom-0 h-0.5", selected ? "bg-navy/30" : "bg-black/5")}
                aria-hidden
              >
                <span className={cn("block h-full", theme.bar)} style={{ width: `${pct}%` }} />
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}