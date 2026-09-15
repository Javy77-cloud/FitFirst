import Link from "next/link";
import {
  dealProductDef,
  dealProductSwitcherHref,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { themeForProduct } from "@/lib/deals/product-ui";
import { cn } from "@/lib/utils";

export type DealProductChipProgress = {
  filled?: number;
  total?: number;
  pct?: number;
  complete?: boolean;
};

export function DealLineSwitcher({
  dealId,
  products,
  active,
  tab,
  complete = {},
  progress = {},
}: {
  dealId: string;
  products: readonly DealProductId[];
  active: DealProductId;
  tab?: string | null;
  complete?: Partial<Record<DealProductId, boolean>>;
  progress?: Partial<Record<DealProductId, DealProductChipProgress>>;
}) {
  if (!products.length) return null;
  const doneCount = products.filter((id) => complete[id] || progress[id]?.complete).length;
  return (
    <div className="mt-2 space-y-1.5" data-ff-deal-product-chip-row="">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-navy">
          Products
          <span className="ml-1.5 font-semibold normal-case tracking-normal text-muted-foreground">
            {`${doneCount}/${products.length} ready`}
          </span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Active chip shows that product’s questions only
        </p>
      </div>
      <nav
        aria-label="Deal products"
        className="flex flex-wrap items-stretch gap-1.5"
        data-ff-deal-line-switcher=""
        data-ff-deal-product-chips=""
      >
        {products.map((product) => {
          const selected = product === active;
          const stat = progress[product];
          const done = Boolean(complete[product] || stat?.complete);
          const pct = done ? 100 : (stat?.pct ?? 0);
          const theme = themeForProduct(product);
          const def = dealProductDef(product);
          return (
            <Link
              key={product}
              href={dealProductSwitcherHref({ dealId, product, tab })}
              scroll={false}
              className={cn(
                "relative min-w-[7.5rem] overflow-hidden rounded-md border-2 px-2.5 py-1.5 text-xs font-semibold transition-colors",
                selected ? theme.chipOn : theme.chip,
              )}
              data-ff-deal-line-chip={def.shopLine}
              data-ff-deal-product-chip={product}
              data-ff-product-complete={done ? "1" : "0"}
              data-active={selected ? "true" : "false"}
              aria-current={selected ? "page" : undefined}
            >
              <span className="flex items-center gap-1">
                {done ? (
                  <span
                    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--ff-green)] text-[9px] text-white"
                    aria-label="Section complete"
                  >
                    ✓
                  </span>
                ) : (
                  <span
                    className={cn("inline-block h-1.5 w-1.5 rounded-full", theme.bar)}
                    aria-hidden
                  />
                )}
                {def.label}
              </span>
              <span
                className={cn("absolute inset-x-0 bottom-0 h-1", selected ? "bg-white/50" : "bg-black/10")}
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
