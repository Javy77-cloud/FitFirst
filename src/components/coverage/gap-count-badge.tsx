import Link from "next/link";

export function GapCountBadge({
  count,
  href,
}: {
  count: number;
  href?: string;
}) {
  if (count <= 0) return null;
  const label = `${count} gap${count === 1 ? "" : "s"}`;
  const className =
    "inline-flex shrink-0 rounded-sm bg-fit-yellow-bg px-1.5 py-0.5 text-[11px] font-semibold text-fit-yellow";
  if (href) {
    return (
      <Link href={href} className={className} data-ff-gap-count={count} title="Coverage gaps on this household">
        {label}
      </Link>
    );
  }
  return (
    <span className={className} data-ff-gap-count={count} title="Coverage gaps on this household">
      {label}
    </span>
  );
}
