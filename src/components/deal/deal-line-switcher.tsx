import Link from "next/link";
import {
  dealProductDef,
  dealProductSwitcherHref,
  type DealProductId,
} from "@/lib/deals/deal-products";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";

export function DealLineSwitcher({
  dealId,
  products,
  active,
  tab,
  complete = {},
}: {
  dealId: string;
  products: readonly DealProductId[];
  active: DealProductId;
  tab?: string | null;
  complete?: Partial<Record<DealProductId, boolean>>;
}) {
  if (!products.length) return null;
  return (
    <nav
      aria-label="Deal products"
      className={`mt-2 ${FF_CHIP_TAB_GROUP}`}
      data-ff-deal-line-switcher=""
      data-ff-deal-product-chips=""
    >
      {products.map((product) => {
        const selected = product === active;
        const done = Boolean(complete[product]);
        return (
          <Link
            key={product}
            href={dealProductSwitcherHref({ dealId, product, tab })}
            scroll={false}
            className={chipTabClass(selected)}
            data-ff-deal-line-chip={dealProductDef(product).shopLine}
            data-ff-deal-product-chip={product}
            data-ff-product-complete={done ? "1" : "0"}
            data-active={selected ? "true" : "false"}
            aria-current={selected ? "page" : undefined}
          >
            {dealProductDef(product).label}
            {done ? (
              <span className="ml-1 text-[10px]" aria-label="Section complete">
                ✓
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
