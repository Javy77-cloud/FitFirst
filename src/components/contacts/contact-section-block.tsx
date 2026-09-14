import type { ReactNode } from "react";
import { formatDay } from "@/lib/domain";

export type ContactSectionListItem = {
  id: string;
  title: string;
  when?: Date | string | null;
  meta?: string | null;
};

function SectionBody({
  emptyLabel,
  emptyCtaHref,
  emptyCtaLabel,
  items,
  children,
}: {
  emptyLabel: string;
  emptyCtaHref?: string;
  emptyCtaLabel?: string;
  items?: ContactSectionListItem[];
  children?: ReactNode;
}) {
  const list = items ?? [];
  const showEmpty = list.length === 0 && !children;
  return (
    <>
      {children ? <div>{children}</div> : null}
      {!children && list.length > 0 ? (
        <ol className="space-y-2">
          {list.map((item) => (
            <li key={item.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[#002868]">{item.title}</span>
                {item.when ? (
                  <span className="text-xs text-muted-foreground">{formatDay(item.when)}</span>
                ) : null}
              </div>
              {item.meta ? <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {showEmpty ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center">
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          {emptyCtaHref && emptyCtaLabel ? (
            <a
              href={emptyCtaHref}
              className="mt-2 inline-flex text-sm font-semibold text-[#002868] hover:underline"
            >
              {emptyCtaLabel}
            </a>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function ContactSectionBlock({
  id,
  title,
  count,
  emptyLabel,
  emptyCtaHref,
  emptyCtaLabel,
  items,
  children,
  bare = false,
}: {
  id: string;
  title: string;
  count?: number;
  emptyLabel: string;
  emptyCtaHref?: string;
  emptyCtaLabel?: string;
  items?: ContactSectionListItem[];
  children?: ReactNode;
  /** When true, render list/empty only (no card/title) — for CollapsibleSection hosts. */
  bare?: boolean;
}) {
  const body = (
    <SectionBody
      emptyLabel={emptyLabel}
      emptyCtaHref={emptyCtaHref}
      emptyCtaLabel={emptyCtaLabel}
      items={items}
    >
      {children}
    </SectionBody>
  );

  if (bare) return <div data-ff={`contact-section-${id}`}>{body}</div>;

  return (
    <section id={id} className="ff-card p-4 scroll-mt-4" data-ff={`contact-section-${id}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[#002868]">{title}</h2>
        {typeof count === "number" && count > 0 ? (
          <span className="text-xs text-muted-foreground">{count}</span>
        ) : null}
      </div>
      <div className="mt-2">{body}</div>
    </section>
  );
}
