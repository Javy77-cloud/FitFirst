import Link from "next/link";
import { bookListHref, lensesFor } from "@/lib/book-lists/lenses";
import type { BookHeat, BookLayout, BookLensId, BookSurface } from "@/lib/book-lists/types";
import { HEAT_META, type HeatLevel } from "@/lib/desk/truth-strip";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";

export function BookLenses({
  surface,
  path,
  heat,
  lens,
  q,
  counts,
  extra,
  layout,
}: {
  surface: BookSurface;
  path: string;
  heat: BookHeat | null;
  lens: BookLensId | null;
  q?: string | null;
  counts: Record<HeatLevel, number>;
  extra?: Record<string, string | undefined>;
  layout?: BookLayout;
}) {
  const saved = lensesFor(surface);
  const layoutHref = (next: BookLayout) => {
    const preserved = { ...(extra ?? {}) };
    if (next === "list") preserved.view = "list";
    else if (next === "stack") preserved.view = "stack";
    else delete preserved.view;
    return bookListHref({ path, q, heat, lens, extra: preserved });
  };
  return (
    <div className="ff-deals-lenses" data-ff-book-lenses={surface}>
      <div className="ff-heat-lenses" aria-label="Heat">
        {(["hot", "cooling", "cold"] as const).map((id) => (
          <Link
            key={id}
            href={bookListHref({
              path,
              q,
              lens,
              heat: heat === id ? null : id,
              extra,
            })}
            className={cn("ff-heat-lens", `ff-heat-${id}`, heat === id && "is-on")}
            data-ff-heat-chip={id}
            title={HEAT_META[id].label}
            aria-label={`${HEAT_META[id].label} ${counts[id]}`}
          >
            <i aria-hidden />
            <span>{counts[id]}</span>
          </Link>
        ))}
      </div>
      {surface === "policies" ? (
        <div className={FF_CHIP_TAB_GROUP} aria-label="Bands Stack List" data-ff-book-layout-toggle="">
          <Link
            href={layoutHref("bands")}
            className={chipTabClass(layout === "bands" || layout == null)}
            data-ff-book-layout="bands"
          >
            Bands
          </Link>
          <Link
            href={layoutHref("stack")}
            className={chipTabClass(layout === "stack")}
            data-ff-book-layout="stack"
          >
            Stack
          </Link>
          <Link
            href={layoutHref("list")}
            className={chipTabClass(layout === "list")}
            data-ff-book-layout="list"
          >
            List
          </Link>
        </div>
      ) : null}
      <div className={FF_CHIP_TAB_GROUP} aria-label="Saved lenses">
        {saved.map((item) => (
          <Link
            key={item.id}
            href={bookListHref({
              path,
              q,
              heat: null,
              lens: lens === item.id ? null : item.id,
              extra,
            })}
            className={chipTabClass(lens === item.id)}
            data-ff-book-lens={item.id}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
