import Link from "next/link";
import { bookListHref } from "@/lib/book-lists/lenses";
import type { BookHeat, BookLayout, BookLensId } from "@/lib/book-lists/types";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";

/** Policies only. Two-option view switch, clear of the saved-lens chips. */
export function PoliciesViewSwitch({
  path,
  heat,
  lens,
  q,
  layout,
  extra,
}: {
  path: string;
  heat: BookHeat | null;
  lens: BookLensId | null;
  q?: string | null;
  layout: BookLayout;
  extra?: Record<string, string | undefined>;
}) {
  const hrefFor = (next: "bands" | "stack") => {
    const preserved = { ...(extra ?? {}) };
    if (next === "stack") preserved.view = "stack";
    else delete preserved.view;
    return bookListHref({ path, q, heat, lens, extra: preserved });
  };
  return (
    <div className="ff-policy-view-row" data-ff-policy-view-row="">
      <div
        className={FF_CHIP_TAB_GROUP}
        aria-label="Bands Stack"
        data-ff-book-layout-toggle=""
        data-ff-policy-view-switch=""
      >
        <Link
          href={hrefFor("bands")}
          className={chipTabClass(layout !== "stack")}
          data-ff-book-layout="bands"
        >
          Bands
        </Link>
        <Link
          href={hrefFor("stack")}
          className={chipTabClass(layout === "stack")}
          data-ff-book-layout="stack"
        >
          Stack
        </Link>
      </div>
    </div>
  );
}
