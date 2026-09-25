import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { portalHref } from "@/lib/portal/session";
import { cn } from "@/lib/utils";

export function PortalLinkCard({
  token,
  label,
}: {
  token: string;
  label: string;
}) {
  const href = portalHref(token);
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Client portal
      </p>
      <p className="mt-1 text-sm text-navy">{label}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{href}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={href} className={cn(buttonVariants({ size: "sm" }))}>
          Open stub link
        </Link>
        <Link
          href={portalHref(token, "changes")}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          Change request
        </Link>
      </div>

    </div>
  );
}
