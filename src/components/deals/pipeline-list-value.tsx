import Link from "next/link";
import type { PipelineListNav } from "@/lib/deals/pipeline-sheet";

export function PipelineListValue({
  nav,
  children,
}: {
  nav: PipelineListNav | null;
  children: React.ReactNode;
}) {
  if (!nav) return <>{children}</>;
  const className = "text-primary hover:underline";
  if (nav.href.startsWith("tel:") || nav.href.startsWith("mailto:")) {
    return (
      <a href={nav.href} className={className} data-ff-pipe-nav={nav.kind}>
        {children}
      </a>
    );
  }
  return (
    <Link href={nav.href} className={className} data-ff-pipe-nav={nav.kind}>
      {children}
    </Link>
  );
}
